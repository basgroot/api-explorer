/*jslint browser: true, for: true, long: true, unordered: true */
/*global window console getQueryParameter */

function yaml() {
    const properties = {
        "file": [],
        "method": "",
        "endpoint": "",
        "lineNumber": 0
    };
    const defaultFieldValues = {
      "assettype": "FxSpot",
      "uic": 21,
      "uics": "21, 22",
      "format": "application/json",
      "contextid": "MyAppContext_" + Date.now(),  // Some unique value
      "referenceid": "MyReferenceId",
      "refreshrate": 200
    };
    let lastLoadedFile = "";

    function init() {
        properties.method = "";
        properties.endpoint = "";
        properties.lineNumber = 0;
    }

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

    function plainTextToHtml(value) {
        return value.replace(/\\r\\n/g, "<br />")
            .replace(/\\"/g, '"');
    }

    function loadYamlEndpoint(callback) {
        const endpoint = getQueryParameter("endpoint", "/trade/v1/infoprices/subscriptions");
        const service = endpoint.substring(1, endpoint.indexOf("/", 1));
        const url = "https://basgroot.github.io/api-explorer/oas/" + service + ".yaml";
        if (lastLoadedFile === url) {
            // File already downloaded.
            callback();
            return;
        }
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
                    lastLoadedFile = url;
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

    function findEndpointInYaml(endpoint, httpMethod) {
        let isPathsSegmentActive = false;
        let isEndpointActive = false;
        let i;
        let line;
        if (properties.lineNumber > 0) {
            // Already searched for this endpoint..
            return properties.lineNumber;
        }
        for (i = 0; i < properties.file.length; i += 1) {
            line = properties.file[i];
            // Start looking for the paths segment:
            if (line === "paths:") {
                isPathsSegmentActive = true;
            } else if (isPathsSegmentActive) {
                // We are in the paths segment. Start looking for the endpoint:
                if (line.charAt(0) !== " ") {
                    isPathsSegmentActive = false;
                    break;  // Stop looking..
                }
                if (line.toLowerCase() === "  " + endpoint.toLowerCase() + ":" || line.toLowerCase() === "  '" + endpoint.toLowerCase() + "':") {
                    isEndpointActive = true;
                } else if (line.charAt(2) !== " ") {
                    isEndpointActive = false;
                } else if (isEndpointActive) {
                    // Endpoint found. Start looking for the method:
                    if (line === "    " + httpMethod + ":") {
                        properties.lineNumber = i + 1;
                        break;
                    }
                }
            }
        }
        if (properties.lineNumber === 0) {
            console.error("Endpoint " + endpoint + " not found with method " + httpMethod);
        }
        return properties.lineNumber;
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
        console.error("No reference: " + line);
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
            console.error("Unknown type: " + type);
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

    function getObjectType(prefix, startLine) {
        let i;
        let line;
        let value;
        for (i = startLine; i < properties.file.length; i += 1) {
            line = properties.file[i];
            value = getValue(line, "type");
            if (value !== "") {
                return returnType(value, i + 1, "");
            }
            if (line === prefix + "allOf:") {
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
            } else if (line === "      allOf:") {
                state = "allOf";
            } else if (state === "enums") {
                defaultStringValue = line.slice(10);
            } else if (state === "properties") {
                if (line.charAt(9) !== " ") {
                    result[line.slice(0, -1).trim()] = getObjectType("          ", i + 1);
                }
            } else if (state === "allOf") {
                value = getValue(line, "$ref");
                if (value !== "") {
                    mainType = parseReference(removeSurroundingQuotes(value));
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
        let key;
        for (key in resultObject) {
            if (typeof resultObject[key] === "object") {
                populateDefaultValues(resultObject[key]);
            } else if (defaultFieldValues[key.toLowerCase()] !== undefined) {
                resultObject[key] = defaultFieldValues[key.toLowerCase()];
            }
        }
    }

    function removeEmptyValues(resultObject) {
        let key;
        for (key in resultObject) {
            const value = resultObject[key];
            if (typeof resultObject[key] === "object") {
                removeEmptyValues(resultObject[key]);
            } else if ((typeof value === "string" && value === "") || (typeof value === "number" && value === 0)) {
                delete resultObject[key];
            }
        }
    }

    function getRequestBody(endpoint, httpMethod) {
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

    function getParameters(endpoint, httpMethod, parameterType) {
        let isParametersActive = false;
        let result = "";
        let i;
        let line;
        let paramName;
        let paramValue;
        for (i = findEndpointInYaml(endpoint, httpMethod); i < properties.file.length; i += 1) {
            line = properties.file[i];
            if (line === "      parameters:") {
                isParametersActive = true;
            } else if (line.charAt(4) !== " ") {
                break;
            } else if (isParametersActive && line.charAt(6) !== " ") {
                break;
            } else if (isParametersActive) {
                paramName = getValue(line, "name");
                if (paramName !== "" && getValue(properties.file[i + 1], "in") === parameterType) {
                    if (defaultFieldValues[paramName.toLowerCase()] === undefined) {
                        // No default - get type:
                        paramValue = getObjectType("            ", i + 2);
                    } else {
                        paramValue = defaultFieldValues[paramName.toLowerCase()];
                    }
                    result += paramName + "=" + paramValue + "\n";
                }
            }
        }
        return result;
    }

    function getEndpointSummary(startLine, key) {
        let i;
        let line;
        let value;
        for (i = startLine; i < properties.file.length; i += 1) {
            line = properties.file[i];
            value = getValue(line, key);
            if (value !== "") {
                break;
            }
        }
        return removeSurroundingQuotes(plainTextToHtml(value));
    }

    function getParameterDocs(startLine, isOnlyRequired) {

        function addParam(parameterName, description, isRequired) {
            if (isOnlyRequired !== isRequired) {
                return "";
            }
            // Fix casing:
            parameterName = parameterName.charAt(0).toUpperCase() + parameterName.substring(1);
            return "<p class=\"param-title\">" + parameterName + "</p>" + "<p class=\"param-description\">" + plainTextToHtml(removeSurroundingQuotes(description)) + "</p>";
        }

        let i;
        let line;
        let value;
        let parameterName = "";
        let description = "";
        let isRequired = false;
        let result = "";
        let isParametersActive = false;
        for (i = startLine; i < properties.file.length; i += 1) {
            line = properties.file[i];
            if (line === "      parameters:") {
                isParametersActive = true;
            } else if (isParametersActive) {
                if (line.charAt(6) !== " ") {
                    result += addParam(parameterName, description, isRequired);
                    break;
                }
                value = getValue(line, "name");
                // Don't list the params with "x-type-name" in the line:
                if (value !== "" && getValue(line, "x-type-name") === "") {
                    if (parameterName !== "") {
                        // This is the next param. Add previous to the list.
                        result += addParam(parameterName, description, isRequired);
                        isRequired = false;
                        description = "";
                        parameterName = "";
                    }
                    parameterName = value;
                } else {
                    value = getValue(line, "description");
                    if (value !== "") {
                        description = value;
                    } else {
                        value = getValue(line, "required");
                        if (value !== "") {
                            isRequired = value === "true";
                        }
                    }
                }
            }
        }
        return result;
    }

    function getRefDoc(endpoint, httpMethod) {
        const startLine = findEndpointInYaml(endpoint, httpMethod);
        let result = "<h1>" + getEndpointSummary(startLine, "summary") + "</h1><p class=\"endpoint-summary\">" + getEndpointSummary(startLine, "description") + "</p>";
        let requiredParameters = getParameterDocs(startLine, true);
        let optionalParameters = getParameterDocs(startLine, false);
        if (requiredParameters !== "") {
            result += "<h2 class=\"parameter-titles\">Required Parameters</h2><hr class=\"endpoint-description\">" + requiredParameters;
        }
        if (optionalParameters !== "") {
            result += "<h2 class=\"parameter-titles\">Optional Parameters</h2><hr class=\"endpoint-description\">" + optionalParameters;
        }
        return result;
    }

    function setupYaml() {
        return Object.freeze({
            init,
            getParameters,
            getRequestBody,
            getRefDoc,
            loadYamlEndpoint,
            defaultFieldValues,
            properties,
            removeEmptyValues
        });
    }

    return setupYaml();
}