/*jslint browser: true, for: true, long: true, unordered: true */
/*global window console yaml tokenObject getToken */

(function () {

    function createTag(name) {
        const b = document.createElement("button");
        b.className = "collapsible";
        b.innerText = name;
        return b;
    }

    function getLinkWrapper() {
        const d = document.createElement("div");
        d.className = "content";
        return d;
    }

    function createLink(title, target) {
        const l = document.createElement("a");
        l.href = target;
        l.text = title;
        l.className = "nav-text";
        return l;
    }

    function getLineBreak() {
        const b = document.createElement("br");
        return b;
    }

    fetch("https://basgroot.github.io/api-explorer/config/navigation.json").then(function (response) {
        if (response.ok) {
            response.json().then(function (responseJson) {
                const showFullMenu = getQueryParameter("all", "") === "1";
                const d = document.getElementById("left-nav-content");
                responseJson.serviceGroups.forEach(function (serviceGroup) {
                    const tag = createTag(serviceGroup.name);
                    const links = getLinkWrapper();
                    const showAll = createLink("Show all..", "");
                    tag.addEventListener("click", function () {
                        this.classList.toggle("active");
                        const content = this.nextElementSibling;
                        if (content.style.maxHeight) {
                            content.style.maxHeight = null;
                        } else {
                            content.style.maxHeight = content.scrollHeight + "px";
                        }
                        if (serviceGroup.articles !== "") {
                            window.location.href = "#art=" + serviceGroup.articles;
                        }
                    });
                    serviceGroup.endpoints.forEach(function (endpoint) {
                        if (endpoint.isFrequentlyUsed || showFullMenu) {
                            let url = "index.html#method=" + endpoint.method + "&endpoint=" + encodeURIComponent(endpoint.endpoint);
                            let link = createLink(endpoint.title, url);
                            links.appendChild(link);
                            links.appendChild(getLineBreak());
                        }
                    });
                    showAll.addEventListener("click", function (evt) {
                        serviceGroup.endpoints.forEach(function (endpoint) {
                            // Add the less common endpoints:
                            if (!endpoint.isFrequentlyUsed && !showFullMenu) {
                                let url = "index.html#method=" + endpoint.method + "&endpoint=" + encodeURIComponent(endpoint.endpoint);
                                let link = createLink(endpoint.title, url);
                                links.appendChild(link);
                                links.appendChild(getLineBreak());
                            }
                            // And hide the showAll:
                            showAll.style.display = "none";
                        });
                        evt.preventDefault();
                    });
                    if (!showFullMenu) {
                        // Only when not all menu items are visible
                        links.appendChild(showAll);
                    }
                    d.appendChild(tag);
                    d.appendChild(links);
                });
            });
        } else {
            console.error("Error loading navigation: " + response.status + " " + response.statusText);
        }
    }).catch(function (error) {
        console.error("Error loading navigation: " + error);
    });

}());
