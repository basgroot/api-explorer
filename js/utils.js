/*jslint browser: true, for: true, long: true, unordered: true */
/*global window console */

let tokenObject = null;

function getQueryParameter(queryParameter, defaultValue) {
    let urlParams;
    let value;
    if (window.URLSearchParams) {
        urlParams = new window.URLSearchParams(
            window.location.hash === ""
            ? window.location.search
            : window.location.hash.replace("#", "?")
        );
        value = urlParams.get(queryParameter);
        if (value) {
            return value;
        } else {
            return defaultValue;
        }
    } else {
        console.error("URLSearchParams not supported - please update your browser - defaulting to " + defaultValue);
        return defaultValue;
    }
}

function getSecondsUntilTokenExpiry(token) {
    const now = new Date();
    const tokenArray = String(token).split(".");
    let payload;
    if (tokenArray.length !== 3) {
        return 0;  // Header, payload and checksum must be available, separated by dots. If not, token is invalid.
    }
    try {
        // The JWT contains an header, payload and checksum
        // Payload is a base64 encoded JSON string
        payload = JSON.parse(window.atob(tokenArray[1]));
        // An example about the different claims can be found here: authentication/token-explained/
        return Math.floor((payload.exp * 1000 - now.getTime()) / 1000);
    } catch (error) {
        console.error("Error getting expiration time of token: " + token);
        console.error(error);
        return 0;
    }
}

function getTokenFromLocalStorage() {
    let lifeTime;
    try {
        tokenObject = JSON.parse(window.localStorage.getItem("token"));
        lifeTime = getSecondsUntilTokenExpiry(tokenObject.access_token);
        // Only reuse if token is valid for longer than 1 minute
        if (lifeTime > 60) {
            window.setTimeout(function () {
                const refreshData = {
                    "requestType": "refreshToken",
                    "refreshToken": tokenObject.refresh_token
                };
                console.log("Requesting token refresh..");
                getToken(refreshData);
            }, Math.max(0, (lifeTime - 30) * 1000));  // Prevent negative values https://stackoverflow.com/questions/8430966/is-calling-settimeout-with-a-negative-delay-ok
            return true;
        }
        return false;
    } catch (ignore) {
        return false;
    }
}

function getToken(data, callback) {
    if (getTokenFromLocalStorage()) {
        if (callback !== undefined) {
            callback();
        }
        return;
    }
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
                    try {
                        window.localStorage.setItem("token", JSON.stringify(tokenObject));
                    } catch (ignore) {
                        console.error("Unable to remember token (LocalStorage not supported).");
                    }
                    window.setTimeout(function () {
                        const refreshData = {
                            "requestType": "refreshToken",
                            "refreshToken": tokenObject.refresh_token
                        };
                        console.log("Requesting token refresh..");
                        getToken(refreshData);
                    }, Math.max(0, (responseJson.expires_in - 30) * 1000));  // Prevent negative values https://stackoverflow.com/questions/8430966/is-calling-settimeout-with-a-negative-delay-ok
                    if (callback !== undefined) {
                        callback();
                    }
                }
            });
        } else {
            console.error(response);
        }
    }).catch(function (error) {
        console.error(error);
    });
}

function loadArticles(mainContentElement) {
    const articles = getQueryParameter("art", "welcome.html");
    mainContentElement.innerHTML = "";
    articles.split(",").forEach(function (article) {
        const articleElement = document.createElement("div");
        mainContentElement.appendChild(articleElement);
        fetch(
            "articles/" + article,
            {
                "method": "GET"
            }
        ).then(function (response) {
            if (response.ok) {
                response.text().then(function (responseText) {
                    articleElement.innerHTML = responseText;
                });
            } else {
                console.error(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    });
}
