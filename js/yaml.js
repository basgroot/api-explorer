/*jslint browser: true, for: true, long: true, unordered: true */
/*global window console getQueryParameter */

function yaml() {
    const properties = {
        "file": "",
        "method": "",
        "endpoint": ""
    };
    const defaultFieldValues = {
      "AssetType": "FxSpot",
      "Uic": 21,
      "Uics": "21, 22",
      "Format": "application/json",
      "ContextId": "MyAppContext_" + Date.now(),  // Some unique value
      "ReferenceId": "MyReferenceId"
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
                    properties.file = textFile.replace(/\r/g, "").split(/\n/g);
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
        properties.method = getQueryParameter("method", "POST");
        return properties.method.toLowerCase();
    }

    function getEndpoint() {
        properties.endpoint = getQueryParameter("endpoint", "/trade/v1/infoprices/subscriptions");
        return properties.endpoint;
    }

    function findEndpointInYaml(endpoint, httpMethod) {
        let isPathsSegmentActive = false;
        let isEndpointActive = false;
        let lineNumber = 0;
        let i;
        let line;
        for (i = 0; i < properties.file.length; i += 1) {
            line = properties.file[i];
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

        const line = properties.file[startLine];
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
        for (i = startLine; i < properties.file.length; i += 1) {
            line = properties.file[i];
            value = getValue(line, "type");
            if (value !== "") {
                return returnType(value, i + 1, "");
            }
            value = getValue(line, "$ref");
            if (value !== "") {
                return parseReference(removeSurroundingQuotes(value));
            }
        }
    }

    function getObjectType(startLine) {
        let i;
        let line;
        let value;
        for (i = startLine; i < properties.file.length; i += 1) {
            line = properties.file[i];
            value = getValue(line, "type");
            if (value !== "") {
                return returnType(value, i + 1, "");
            }
            if (line === "          allOf:") {
                return parseAllOf(i + 1);
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
        for (i = startLine; i < properties.file.length; i += 1) {
            line = properties.file[i];
            if (line.charAt(5) !== " ") {
                if (state === "properties") {
                    // Break and return the object:
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
        const searchPath = reference.split("/");  // #/components/schemas/PriceSubscriptionRequest
        let prefix = "";
        let result;
        searchPath.shift();  // Remove the #
        properties.file.forEach(function (line, i) {
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

    function populateDefaultValues(resultObject) {
        for (const key in resultObject) {
            if (typeof resultObject[key] === "object") {
                populateDefaultValues(resultObject[key]);
            } else if (defaultFieldValues[key] !== undefined) {
                resultObject[key] = defaultFieldValues[key];
            }
        }
    }

    function getYamlRequestBody(endpoint, httpMethod) {
        let resultObject;
        let result = "";
        let i;
        let line;
        for (i = findEndpointInYaml(endpoint, httpMethod); i < properties.file.length; i += 1) {
            line = properties.file[i];
            if (line === "      requestBody:") {
                resultObject = parseReference(removeSurroundingQuotes(getValue(properties.file[i + 4], "$ref")));
                populateDefaultValues(resultObject);
                result = JSON.stringify(resultObject, null, 4);
                break;
            }
            if (line.charAt(4) !== " ") {
                break;
            }
        }
        return result;
    }

    function setupYaml() {
        return Object.freeze({
            getHttpMethod,
            getEndpoint,
            getYamlRequestBody,
            loadYamlEndpoint,
            defaultFieldValues,
            properties
        });
    }

    return setupYaml();
}