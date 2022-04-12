/*jslint browser: true, for: true, long: true, unordered: true */
/*global window console yaml tokenObject getToken */

(function () {
    const yamlUtils = yaml();
    const streamerUtils = streamer(messageCallback);
    const urlPrefix = "https://gateway.saxobank.com/sim/openapi";
    const usersEndpoint = "/port/v1/users/me";
    const clientsEndpoint = "/port/v1/clients/me";
    const messages = [];
    let userLoaded = false;
    let clientLoaded = false;
    let streamerNotificationTimer;

    function messageCallback(message) {
        const tabElement = document.getElementById("idBtnStreamingData");
        let messageList = "";
        messages.unshift({
            "dt": new Date(),
            "payload": JSON.stringify(message.payload, null, 4),
            "messageId": message.messageId,
            "referenceId": message.referenceId
        });
        if (messages.length > 10) {
            messages.pop();
        }
        messages.forEach(function (messageObject) {
            messageList += "Message #" + messageObject.messageId + " @ " + messageObject.dt.toLocaleString() + " with reference " + messageObject.referenceId + ":\n" + messageObject.payload + "\n\n";
        })
        document.getElementById("idStreamingData").innerText = messageList;
        // Give a notification that the tab has aan update, when hidden
        if (!tabElement.classList.contains("active")) {
            window.clearTimeout(streamerNotificationTimer);
            tabElement.style.color = "red";
            streamerNotificationTimer = window.setTimeout(function () {
                tabElement.style.color = "black";
            }, 300);
        }
    }

    function displayTab(evt, tabName) {
        let i;
        let tabcontent;
        let tablinks;
        // Get all elements with class="tabcontent" and hide them
        tabcontent = document.getElementsByClassName("tabcontent");
        for (i = 0; i < tabcontent.length; i += 1) {
            tabcontent[i].style.display = "none";
        }
        // Get all elements with class="tablinks" and remove the class "active"
        tablinks = document.getElementsByClassName("tablinks");
        for (i = 0; i < tablinks.length; i += 1) {
            tablinks[i].classList.remove("active");
        }
        // Show the current tab, and add an "active" class to the button that opened the tab
        document.getElementById(tabName).style.display = "block";
        evt.currentTarget.classList.add("active");
    }

    function getUserData(endpoint) {
        fetch(
            urlPrefix + endpoint,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + tokenObject.access_token
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    switch (endpoint) {
                    case usersEndpoint:
                        yamlUtils.defaultFieldValues.clientkey = responseJson.ClientKey;
                        yamlUtils.defaultFieldValues.userkey = responseJson.UserKey;
                        userLoaded = true;
                        break;
                    case clientsEndpoint:
                        yamlUtils.defaultFieldValues.accountkey = responseJson.DefaultAccountKey;
                        clientLoaded = true;
                        break;
                    default:
                        console.error("Unexpected endpoint: " + endpoint);
                    }
                    if (userLoaded && clientLoaded) {
                        yamlUtils.loadYamlEndpoint(populateScreen);
                    }
                });
            } else {
                response.json().then(function (responseJson) {
                    console.error(JSON.stringify(responseJson, null, 4));
                }).catch(function () {
                    console.error("Error with status " + response.status + " " + response.statusText);
                });
            }
        }).catch(function (error) {
            console.error("Error: " + error);
        });
    }

    function sendRequest() {

        function getParameters(id) {
            const value = document.getElementById(id).innerText;
            return value.trim().replace(/\r/g, "").split(/\n/g);
        }

        function getQueryParameters(parameters) {
            let result = "";
            parameters.forEach(function (parameter) {
                const pos = parameter.indexOf("=");
                const key = parameter.substring(0, pos);
                const value = parameter.substring(pos + 1);
                if (value !== "" && value !== "0") {
                    result += (
                        result === ""
                        ? "?"
                        : "&"
                    ) + key + "=" + encodeURIComponent(value);
                }
            });
            return result;
        }

        function processPathParameters(url, parameters) {
            parameters.forEach(function (parameter) {
                const pos = parameter.indexOf("=");
                const key = "{" + parameter.substring(0, pos) + "}";
                const regExp = new RegExp(key, "gi");
                const value = parameter.substring(pos + 1);
                url = url.replace(regExp, encodeURIComponent(value));
            });
            return url;
        }

        function getPostBody() {
            try {
                return JSON.parse(document.getElementById("idRequestBody").innerText);
            } catch (error) {
                console.error(error);
                return {};
            }
        }

        function showResponse(response, isResponseOk) {
            const responseElement = document.getElementById("idResponse");
            responseElement.innerText = response;
            if (isResponseOk) {
                responseElement.classList.remove("error");
            } else {
                responseElement.classList.add("error");
            }
            // And show the response tab:
            document.getElementById("idBtnResponse").click();
        }

        function setupStreamer() {
            const postBody = getPostBody();
            if (postBody.ContextId !== undefined) {
                console.log("Requesting streaming connection.");
                streamerUtils.createConnection(tokenObject.access_token, postBody.ContextId);
                streamerUtils.startListener();
            }
        }

        const url = processPathParameters(urlPrefix + yamlUtils.properties.endpoint, getParameters("idPathParameters"));
        const method = yamlUtils.properties.method.toUpperCase();
        const fetchData = {
            "method": method,
            "headers": {
                "Authorization": "Bearer " + tokenObject.access_token
            }
        };
        let postBody;
        let queryParameters = getQueryParameters(getParameters("idQueryParameters"));
        if (method === "POST" || method === "PATCH") {
            postBody = getPostBody(postBody);
            yamlUtils.removeEmptyValues(postBody);
            fetchData.body = JSON.stringify(postBody);
            fetchData.headers["Content-Type"] = "application/json; charset=utf-8";
            if (yamlUtils.properties.endpoint.slice(-14) === "/subscriptions") {
                setupStreamer();
            }
        }
        fetch(url + queryParameters, fetchData).then(function (response) {
            const correlationInfo = "X-Correlation header (for troubleshooting with Saxo): " + response.headers.get("X-Correlation");
            if (response.ok) {
                if (method === "DELETE" || method === "PUT") {
                    showResponse("Response successful status " + response.status + " " + response.statusText, true);
                } else {
                    response.json().then(function (responseJson) {
                        showResponse(JSON.stringify(responseJson, null, 4), true);
                    });
                }
            } else {
                response.json().then(function (responseJson) {
                    showResponse(JSON.stringify(responseJson, null, 4) + "\n\n" + correlationInfo, false);
                }).catch(function () {
                    showResponse("Error with status " + response.status + " " + response.statusText + "\n\n" + correlationInfo, false);
                });
            }
        }).catch(function (error) {
            showResponse("Error: " + error, false);
        });
    }

    function setupEvents() {
        if ("onhashchange" in window) {
            window.onhashchange = function () {
                yamlUtils.loadYamlEndpoint(populateScreen);
            };
        }
        document.getElementById("idBtnRequest").addEventListener("click", function (evt) {
            displayTab(evt, "idTabRequest");
        });
        document.getElementById("idBtnResponse").addEventListener("click", function (evt) {
            displayTab(evt, "idTabResponse");
        });
        document.getElementById("idBtnStreamingData").addEventListener("click", function (evt) {
            displayTab(evt, "idTabStreamingData");
        });
        document.getElementById("idBtnRequest").click();
        document.getElementById("idBtnSendRequest").addEventListener("click", function () {
            if (tokenObject === null) {
                getToken({
                    "requestType": "requestToken"
                }, sendRequest);
            } else {
                sendRequest();
            }
        });
        getToken({
            "requestType": "requestToken"
        }, function () {
            getUserData(usersEndpoint);
            getUserData(clientsEndpoint);
        });
    }

    function getRESTMethodColor(method) {
        method = method.toLowerCase();
        console.log("debug", method);
        if (method == "get") {
            return "var(--color-get)";
        } else if (method == "post") {
            return "var(--color-post)";
        } else if (method == "put") {
            return "var(--color-put)";
        } else if (method == "patch") {
            return "var(--color-patch)";
        } else if (method == "delete") {
            return "var(--color-delete)";
        } else {
            console.error("Unrecognized method!", method);
            return "var(--color-black-1)";
        }
    }

    function populateScreen() {

        function populateEditableContent(id, parentId, value) {
            const editableContent = document.getElementById(id);
            editableContent.innerText = value;
            if (value === "") {
                document.getElementById(parentId).style.display = "none";
            } else {
                document.getElementById(parentId).style.display = "";
            }
        }

        yamlUtils.init();  // Reset cache
        const httpMethod = getQueryParameter("method", "").toLowerCase();
        const endpoint = getQueryParameter("endpoint", "");
        const mainContentElement = document.getElementById("idMainContent");
        if (httpMethod === "" && endpoint === "") {
            // Hide Explorer:
            document.getElementById("idExplorer").style.display = "none";
            document.getElementById("right-inner-2").style.width = "0%";
            // Load article(s):
            loadArticles(mainContentElement);
        } else {
            yamlUtils.properties.method = httpMethod;
            yamlUtils.properties.endpoint = endpoint;
            // set width back
            document.getElementById("right-inner-2").style.width = "30%";
            // Show Explorer:
            document.getElementById("idExplorer").style.display = "";
            // Get method from the URL:
            document.getElementById("idHttpMethod").innerText = httpMethod.toUpperCase();
            let methodColor = getRESTMethodColor(httpMethod);
            document.getElementById("idHttpMethod").style.color = methodColor;
            console.log("Check this: ", methodColor);
            // Get endpoint from the URL:
            document.getElementById("idEndpoint").innerText = endpoint;
            // Get the path parameters from the yaml file:
            populateEditableContent("idPathParameters", "idPathParametersContainer", yamlUtils.getParameters(endpoint, httpMethod, "path"));
            // Get the query parameters from the yaml file:
            populateEditableContent("idQueryParameters", "idQueryParametersContainer", yamlUtils.getParameters(endpoint, httpMethod, "query"));
            // Get the request object from the yaml file:
            populateEditableContent("idRequestBody", "idRequestBodyContainer", yamlUtils.getRequestBody(endpoint, httpMethod));
            // Get the reference documentation from yaml:
            mainContentElement.innerHTML = yamlUtils.getRefDoc(endpoint, httpMethod);
        }
    }

    setupEvents();
}());
