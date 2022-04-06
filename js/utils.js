function getQueryParameter(queryParameter, defaultValue) {
    let urlParams;
    let value;
    if (window.URLSearchParams) {
        urlParams = new window.URLSearchParams(window.location.search);
        value = urlParams.get(queryParameter);
        if (value) {
            return value;
        } else {
            console.error(queryParameter + " not specified in the query params - defaulting to " + defaultValue);
            return defaultValue;
        }
    } else {
        console.error("URLSearchParams not supported - please update your browser - defaulting to " + defaultValue);
        return defaultValue;
    }
}

