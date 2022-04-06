/*jslint browser: true, for: true, long: true, unordered: true */
/*global window console getQueryParameter */

const yaml = {
    "file": "",
    "method": "",
    "endpoint": ""
};

function getValue(line, key) {
    const keyValue = line.split(key + ": ");
    return (
        keyValue.length === 2
        ? keyValue[1].trim()
        : ""
    );
}

function removeSurroundingQuotes(line) {
    if ((line.charAt(0) === "'" && line.charAt(line.length - 1) === "'") || (line.charAt(0) === "\"" && line.charAt(line.length - 1) === "\"")) {
        return line.slice(1, -1);
    }
    return line;
}

function loadYamlEndpoint(callback) {
    const url = "https://basgroot.github.io/api-explorer/oas/" + getQueryParameter("service", "trade") + ".yaml";
    fetch(
        url,
        {
            "method": "GET",
            "headers": {
            }
        }
    ).then(function (response) {
        if (response.ok) {
            response.text().then(function (textFile) {
                yaml.file = textFile.replace(/\r/g, "").split(/\n/g);
                console.log("Download successful: " + url);
                callback();
            });
        } else {
            console.error(response);
        }
    }).catch(function (error) {
        console.error(error);
    });
}

function getHttpMethod() {
    yaml.method = getQueryParameter("method", "POST");
    return yaml.method.toLowerCase();
}

function getEndpoint() {
    yaml.endpoint = getQueryParameter("endpoint", "/trade/v1/infoprices/subscriptions");
    return yaml.endpoint;
}

function findEndpointInYaml(endpoint, httpMethod) {
    let isPathsSegmentActive = false;
    let isEndpointActive = false;
    let lineNumber = 0;
    let i;
    let line;
    for (i = 0; i < yaml.file.length; i += 1) {
        line = yaml.file[i];
        // Start looking for the paths segment:
        if (line === "paths:") {
            isPathsSegmentActive = true;
        } else if (line.charAt(0) !== " ") {
            isPathsSegmentActive = false;
        } else if (isPathsSegmentActive) {
            // We are in the paths segment. Start looking for the endpoint:
            if (line === "  " + endpoint + ":" || line === "  '" + endpoint + "':") {
                isEndpointActive = true;
            } else if (line.charAt(2) !== " ") {
                isEndpointActive = false;
            } else if (isEndpointActive) {
                // Endpoint found. Start looking for the method:
                if (line === "    " + httpMethod + ":") {
                    lineNumber = i + 1;
                    break;
                }
            }
        }
    }
    if (lineNumber === 0) {
        console.error("Endpoint " + endpoint + " not found with method " + httpMethod);
    }
    return lineNumber;
}

function getArrayItem(startLine) {
  //    type: array
  //    items:
  //      $ref: '#/components/schemas/MultiLegOrderLeg'

  //    type: array
  //    items:
  //      type: number
  //    x-license-terms:
  //      description: 'Price values are depending on a subscription to a feed. This can mean no data, delayed data or real time data dependent on the callers subscription setup.'

  //  type: array
  //  items:
  //    type: string

    const line = yaml.file[startLine];
    let value = getValue(line, "$ref");
    if (value !== "") {
        return parseReference(removeSurroundingQuotes(value));
    }
    window.alert("No reference: " + line);
}

function returnType(type, startLine, defaultStringValue) {
    switch (type) {
    case "integer":
    case "number":
        return 0;
    case "string":
        return defaultStringValue;
    case "array":
        return [getArrayItem(startLine + 1)];
    case "boolean":
        return false;
    case "object":
        return {};
    default:
        window.alert("Unknown type: " + type);
    }
}

function parseAllOf(startLine) {
    let i;
    let line;
    let value;
    for (i = startLine; i < yaml.file.length; i += 1) {
        line = yaml.file[i];
        value = getValue(line, "type");
        if (value !== "") {
            return returnType(value, yaml.file, i + 1, "");
        }
        value = getValue(line, "$ref");
        if (value !== "") {
            return parseReference(yaml.file, removeSurroundingQuotes(value));
        }
    }
}

function getObjectType(startLine) {
    let i;
    let line;
    let value;
    for (i = startLine; i < yaml.file.length; i += 1) {
        line = yaml.file[i];
        value = getValue(line, "type");
        if (value !== "") {
            return returnType(value, yaml.file, i + 1, "");
        }
        if (line === "          allOf:") {
            return parseAllOf(yaml.file, i + 1);
        }
    }
}

function parseObject(startLine) {
    let result = {};
    let i;
    let line;
    let state = "header";
    let value;
    let mainType;
    let defaultStringValue = "";
    for (i = startLine; i < yaml.file.length; i += 1) {
        line = yaml.file[i];
        if (line.charAt(5) !== " ") {
            if (state === "properties") {
                return result;
            }
            return mainType;
        }
        value = getValue(line, "type");
        if (value !== "") {
            mainType = returnType(value, i + 1, defaultStringValue);
        }
        if (line === "      enum:") {
            state = "enums";
        } else if (line === "      properties:") {
            state = "properties";
        } else if (state === "enums") {
            defaultStringValue = line.slice(10);
        } else if (state === "properties") {
            if (line.charAt(9) !== " ") {
                result[line.slice(0, -1).trim()] = getObjectType(i + 1);
            }
        }
    }
}

function parseReference(reference) {
    const searchPath = reference.split("/");  // #/components/schemas/AllocationKeyCreateRequest
    let prefix = "";
    let result;
    searchPath.shift();  // Remove the #
    yaml.file.forEach(function (line, i) {
        if (line === prefix + searchPath[0] + ":") {
            // Found path
            if (searchPath.length === 1) {
                result = parseObject(i + 1);
                return;
            }
            prefix += "  ";
            searchPath.shift();
        }
    });
    return result;
}

function getYamlRequestBody(endpoint, httpMethod) {
    let result = "";
    let i;
    let line;
    for (i = findEndpointInYaml(endpoint, httpMethod); i < yaml.file.length; i += 1) {
        line = yaml.file[i];
        if (line === "      requestBody:") {
            result = JSON.stringify(parseReference(removeSurroundingQuotes(getValue(yaml.file[i + 4], "$ref"))), null, 4);
            break;
        }
        if (line.charAt(4) !== " ") {
            break;
        }
    }
    return result;
}
