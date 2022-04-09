/*jslint browser: true, for: true, long: true, unordered: true */
/*global window console getQueryParameter */

(function () {

    function createLink(title, target) {
        const link = document.createElement("a");
        link.href = target;
        link.text = title;
        link.className = "nav-text";
        return link;
    }

    function createDetails(title, articles) {
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        if (articles !== "") {
            summary.addEventListener("click", function () {
                window.location.href = "#art=" + articles;
            });
        }
        summary.appendChild(document.createTextNode(title));
        details.appendChild(summary);
        return details;
    }

    function createEndpointLink(details, endpoint) {
        const url = "index.html#method=" + endpoint.method + "&endpoint=" + encodeURIComponent(endpoint.endpoint);
        const link = createLink(endpoint.title, url);
        details.appendChild(link);
        details.appendChild(document.createElement("br"));
    }

    fetch("https://basgroot.github.io/api-explorer/config/navigation.json").then(function (response) {
        if (response.ok) {
            response.json().then(function (responseJson) {
                const showFullMenu = getQueryParameter("all", "") === "1";
                const d = document.getElementById("left-nav-content");
                responseJson.serviceGroups.forEach(function (serviceGroup) {
                    const details = createDetails(serviceGroup.name, serviceGroup.articles);
                    let isEndpointHidden = false;
                    serviceGroup.endpoints.forEach(function (endpoint) {
                        if (endpoint.isFrequentlyUsed || showFullMenu) {
                            createEndpointLink(details, endpoint);
                        } else {
                            isEndpointHidden = true;
                        }
                    });
                    if (!showFullMenu && isEndpointHidden) {
                        // Only when not all endpoints are visible
                        const showAllLink = createLink("Show all…", "");
                        showAllLink.addEventListener("click", function (evt) {
                            serviceGroup.endpoints.forEach(function (endpoint) {
                                // Add the less common endpoints:
                                if (!endpoint.isFrequentlyUsed && !showFullMenu) {
                                    createEndpointLink(details, endpoint);
                                }
                            });
                            // And hide the showAllLink:
                            showAllLink.style.display = "none";
                            evt.preventDefault();
                        });
                        details.appendChild(showAllLink);
                    }
                    d.appendChild(details);
                });
            });
        } else {
            console.error("Error loading navigation: " + response.status + " " + response.statusText);
        }
    }).catch(function (error) {
        console.error("Error loading navigation: " + error);
    });

}());
