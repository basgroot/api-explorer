/*jslint browser: true, for: true, long: true, unordered: true */
/*global window console */

(function () {
    let tokenObject = null;

    function displayTab(evt, cityName) {
        // Declare all variables
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
           tablinks[i].className = tablinks[i].className.replace(" active", "");
        }
        // Show the current tab, and add an "active" class to the button that opened the tab
        document.getElementById(cityName).style.display = "block";
        evt.currentTarget.className += "active";
    }

    function getToken(data, callback) {
        fetch(
            "https://www.basement.nl/saxo/token/",
            {
                "method": "POST",
                "headers": {
                    "Content-Type": "application/json; charset=utf-8"
                },
                "body": JSON.stringify(data)
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    if (responseJson.hasOwnProperty("error")) {
                        console.error(responseJson.error);
                    } else {
                        tokenObject = responseJson;
                        window.setTimeout(function () {
                            const refreshData = {
                                "requestType": "refreshToken",
                                "refreshToken": tokenObject.refresh_token
                            };
                            console.log("Requesting token refresh..");
                            getToken(refreshData);
                        }, Math.max(0, (responseJson.expires_in - 5) * 1000));  // Prevent negative values https://stackoverflow.com/questions/8430966/is-calling-settimeout-with-a-negative-delay-ok
                        if (callback !== undefined) {
                            callback();
                        }
                    }
                });
            } else {
                processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    function sendRequest() {

        function showResponse(response, isResponseOk) {
            document.getElementById("idResponse").innerText = response;
            document.getElementById("idBtnResponse").click();
        }

        const url = "https://gateway.saxobank.com/sim/openapi" + yaml.endpoint;
        const method = yaml.method.toUpperCase();
        const fetchData = {
            "method": method,
            "headers": {
                "Authorization": "Bearer " + tokenObject.access_token
            }
        };
        if (method === "POST" || method === "PATCH") {
            fetchData.body = document.getElementById("idRequestBody").value;
            fetchData.headers["Content-Type"] = "application/json; charset=utf-8";
        }
        fetch(url, fetchData).then(function (response) {
            const correlationInfo = "X-Correlation header (for troubleshooting with Saxo): " + response.headers.get("X-Correlation");
            if (response.ok) {
                response.json().then(function (responseJson) {
                    showResponse(JSON.stringify(responseJson, null, 4), true);
                });
            } else {
                response.json().then(function (responseJson) {
                    showResponse(JSON.stringify(responseJson, null, 4), false);
                }).catch(function () {
                    showResponse("Error with status " + response.status + " " + response.statusText, false);
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
    }

    function populateScreen() {
        const httpMethod = getHttpMethod();
        const endpoint = getEndpoint();
        // Get method from the URL:
        document.getElementById("idHttpMethod").innerText = httpMethod.toUpperCase();
        // Get endpoint from the URL:
        document.getElementById("idEndpoint").innerText = endpoint;
        // Get the request object from the yaml file:
        document.getElementById("idRequestBody").value = getYamlRequestBody(endpoint, httpMethod);
    }

    setupEvents();
    loadYamlEndpoint(populateScreen);
}());
