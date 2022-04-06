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

    function messageCallback(message) {
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
                        yamlUtils.defaultFieldValues.ClientKey = responseJson.ClientKey;
                        yamlUtils.defaultFieldValues.UserKey = responseJson.UserKey;
                        userLoaded = true;
                        break;
                    case clientsEndpoint:
                        yamlUtils.defaultFieldValues.AccountKey = responseJson.DefaultAccountKey;
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
            try {
                const postBody = JSON.parse(document.getElementById("idRequestBody").value);
                if (postBody.ContextId !== undefined) {
                    console.log("Requesting streaming connection.");
                    streamerUtils.createConnection(tokenObject.access_token, postBody.ContextId);
                    streamerUtils.startListener();
                }
            } catch (error) {
                console.error(error);
            }
        }

        const url = urlPrefix + yamlUtils.properties.endpoint;
        const method = yamlUtils.properties.method.toUpperCase();
        const fetchData = {
            "method": method,
            "headers": {
                "Authorization": "Bearer " + tokenObject.access_token
            }
        };
        if (method === "POST" || method === "PATCH") {
            fetchData.body = document.getElementById("idRequestBody").value;
            fetchData.headers["Content-Type"] = "application/json; charset=utf-8";
            if (yamlUtils.properties.endpoint.slice(-14) === "/subscriptions") {
                setupStreamer();
            }
        }
        fetch(url, fetchData).then(function (response) {
            const correlationInfo = "X-Correlation header (for troubleshooting with Saxo): " + response.headers.get("X-Correlation");
            if (response.ok) {
                response.json().then(function (responseJson) {
                    showResponse(JSON.stringify(responseJson, null, 4), true);
                });
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

    function populateScreen() {
        const httpMethod = yamlUtils.getHttpMethod();
        const endpoint = yamlUtils.getEndpoint();
        // Get method from the URL:
        document.getElementById("idHttpMethod").innerText = httpMethod.toUpperCase();
        // Get endpoint from the URL:
        document.getElementById("idEndpoint").innerText = endpoint;
        // Get the request object from the yaml file:
        document.getElementById("idRequestBody").value = yamlUtils.getYamlRequestBody(endpoint, httpMethod);
    }

    setupEvents();
}());
