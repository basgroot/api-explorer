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
        return l;
    }

    function getLineBreak() {
        const b = document.createElement("br");
        return b;
    }

    function getUrl(method, endpoint) {
        const url = "index.html#method=" + method + "&endpoint=" + encodeURIComponent(endpoint);
        return url;
    }

    fetch("https://basgroot.github.io/api-explorer/config/navigation_new.json").then(function (response) {
        if (response.ok) {
            response.json().then(function (responseJson) {
                const d = document.getElementById("left-nav-content");
                let tagName;
                let i;
                for (tagName in responseJson) {
                    if (tagName !== "Tag") {
                        const tag = createTag(tagName);
                        const links = getLinkWrapper();
                        for (i in responseJson[tagName]) {
                            let title = responseJson[tagName][i].title;
                            let method =  responseJson[tagName][i].method;
                            let endpoint =  responseJson[tagName][i].endpoint;
                            let url = getUrl(method, endpoint);
                            let link = createLink(title, url);
                            links.appendChild(link);
                            links.appendChild(getLineBreak());
                        }
                        d.appendChild(tag);
                        d.appendChild(links);
                    }
                }
                const coll = document.getElementsByClassName("collapsible");
                for (i = 0; i < coll.length; i += 1) {
                    coll[i].addEventListener("click", function() {
                        this.classList.toggle("active");
                        const content = this.nextElementSibling;
                        if (content.style.maxHeight){
                            content.style.maxHeight = null;
                        } else {
                            content.style.maxHeight = content.scrollHeight + "px";
                        }
                    });
                }
            });
        } else {
            console.error("Error loading navigation: " + response.status + " " + response.statusText);
        }
    }).catch(function (error) {
        console.error("Error loading navigation: " + error);
    });

}());
