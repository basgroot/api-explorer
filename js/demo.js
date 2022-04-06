/*jslint browser: true, for: true, long: true, unordered: true */
/*global window console */

(function () {

    function displayTab(evt, cityName) {
        // Declare all variables
        var i, tabcontent, tablinks;
        // Get all elements with class="tabcontent" and hide them
        tabcontent = document.getElementsByClassName("tabcontent");
        for (i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
        }
        // Get all elements with class="tablinks" and remove the class "active"
        tablinks = document.getElementsByClassName("tablinks");
        for (i = 0; i < tablinks.length; i++) {
           tablinks[i].className = tablinks[i].className.replace(" active", "");
        }
        // Show the current tab, and add an "active" class to the button that opened the tab
        document.getElementById(cityName).style.display = "block";
        evt.currentTarget.className += "active";
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
    }

    function populateScreen() {
        const httpMethod = getHttpMethod();
        const endpoint = getEndpoint();
        // Get method from the URL:
        document.getElementById("idHttpMethod").innerText = httpMethod;
        // Get endpoint from the URL:
        document.getElementById("idEndpoint").innerText = endpoint;
        // Get the request object from the yaml file:
        document.getElementById("idRequestData").value = getYamlRequestBody(endpoint, httpMethod);
    }

    setupEvents();
    loadYamlEndpoint(populateScreen);
}());
