/*jslint browser: true, for: true, long: true, unordered: true */
/*global window console */

function streamer(messageCallback) {
    let connection = null;

    /**
     * Test if the browser supports the features required for websockets.
     * @return {boolean} True when the features are available.
     */
    function isWebSocketsSupportedByBrowser() {
        return (
            Boolean(window.WebSocket) &&
            Boolean(window.Int8Array) &&
            Boolean(window.Uint8Array) &&
            Boolean(window.TextDecoder)
        );
    }

    /**
     * This is an example of constructing the websocket connection.
     * @return {void}
     */
    function createConnection(accessToken, contextId) {
        const streamerUrl = "wss://streaming.saxobank.com/sim/openapi/streamingws/connect?authorization=" + encodeURIComponent("BEARER " + accessToken) + "&contextId=" + contextId;
        if (!isWebSocketsSupportedByBrowser()) {
            console.error("This browser doesn't support WebSockets.");
            throw "This browser doesn't support WebSockets.";
        }
        if (connection !== null) {
            console.log("Connection already active.");
            return;
        }
        try {
            connection = new window.WebSocket(streamerUrl);
            connection.binaryType = "arraybuffer";
            console.log("Connection created with binaryType '" + connection.binaryType + "'. ReadyState: " + connection.readyState + ".");
            // Documentation on readyState: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
            // 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
        } catch (error) {
            console.error("Error creating websocket. " + error);
        }
    }

    /**
     * This function initiates the events and contains the processing of new messages.
     * @return {void}
     */
    function startListener() {
        const utf8Decoder = new window.TextDecoder();

        /**
         * Creates a Long from its little endian byte representation (function is part of long.js - https://github.com/dcodeIO/long.js).
         * @param {!Array.<number>} bytes Little endian byte representation
         * @param {boolean=} unsigned Whether unsigned or not, defaults to signed
         * @returns {number} The corresponding Long value
         */
        function fromBytesLe(bytes, unsigned) {
            const low = (bytes[0] | bytes[1] << 8 | bytes[2] << 16 | bytes[3] << 24) | 0;
            const high = (bytes[4] | bytes[5] << 8 | bytes[6] << 16 | bytes[7] << 24) | 0;
            const twoPwr16Dbl = 1 << 16;
            const twoPwr32Dbl = twoPwr16Dbl * twoPwr16Dbl;
            if (unsigned) {
                return (high >>> 0) * twoPwr32Dbl + (low >>> 0);
            }
            return high * twoPwr32Dbl + (low >>> 0);
        }

        /**
         * Parse the incoming messages. Documentation on message format: https://www.developer.saxo/openapi/learn/plain-websocket-streaming#PlainWebSocketStreaming-Receivingmessages
         * @param {Object} data The received stream message
         * @returns {Array.<Object>} Returns an array with all incoming messages of the frame
         */
        function parseMessageFrame(data) {
            const message = new DataView(data);
            const parsedMessages = [];
            let index = 0;
            let messageId;
            let referenceIdSize;
            let referenceIdBuffer;
            let referenceId;
            let payloadFormat;
            let payloadSize;
            let payloadBuffer;
            let payload;
            while (index < data.byteLength) {
                /* Message identifier (8 bytes)
                 * 64-bit little-endian unsigned integer identifying the message.
                 * The message identifier is used by clients when reconnecting. It may not be a sequence number and no interpretation
                 * of its meaning should be attempted at the client.
                 */
                messageId = fromBytesLe(new window.Uint8Array(data, index, 8));
                index += 8;
                /* Version number (2 bytes)
                 * Ignored in this example. Get it using 'messageEnvelopeVersion = message.getInt16(index)'.
                 */
                index += 2;
                /* Reference id size 'Srefid' (1 byte)
                 * The number of characters/bytes in the reference id that follows.
                 */
                referenceIdSize = message.getInt8(index);
                index += 1;
                /* Reference id (Srefid bytes)
                 * ASCII encoded reference id for identifying the subscription associated with the message.
                 * The reference id identifies the source subscription, or type of control message (like '_heartbeat').
                 */
                referenceIdBuffer = new window.Int8Array(data, index, referenceIdSize);
                referenceId = String.fromCharCode.apply(String, referenceIdBuffer);
                index += referenceIdSize;
                /* Payload format (1 byte)
                 * 8-bit unsigned integer identifying the format of the message payload. Currently the following formats are defined:
                 *  0: The payload is a UTF-8 encoded text string containing JSON.
                 *  1: The payload is a binary protobuffer message.
                 * The format is selected when the client sets up a streaming subscription so the streaming connection may deliver a mixture of message format.
                 * Control messages such as subscription resets are not bound to a specific subscription and are always sent in JSON format.
                 */
                payloadFormat = message.getUint8(index);
                index += 1;
                /* Payload size 'Spayload' (4 bytes)
                 * 64-bit little-endian unsigned integer indicating the size of the message payload.
                 */
                payloadSize = message.getUint32(index, true);
                index += 4;
                /* Payload (Spayload bytes)
                 * Binary message payload with the size indicated by the payload size field.
                 * The interpretation of the payload depends on the message format field.
                 */
                payloadBuffer = new window.Uint8Array(data, index, payloadSize);
                payload = null;
                switch (payloadFormat) {
                case 0:
                    // JSON
                    try {
                        payload = JSON.parse(utf8Decoder.decode(payloadBuffer));
                    } catch (error) {
                        console.error(error);
                    }
                    break;
                case 1:
                    // ProtoBuf is not supported in this example. See the realtime-quotes example for a Protocol Buffers implementation.
                    console.error("Protocol Buffers are not supported in this example.");
                    break;
                default:
                    console.error("Unsupported payloadFormat: " + payloadFormat);
                }
                if (payload !== null) {
                    parsedMessages.push({
                        "messageId": messageId,
                        "referenceId": referenceId,
                        "payload": payload
                    });
                }
                index += payloadSize;
            }
            return parsedMessages;
        }

        connection.onopen = function () {
            console.log("Streaming connected.");
        };
        connection.onclose = function (evt) {
            // Status codes: https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent
            if (evt.wasClean === true) {
                console.log("Streaming disconnected with code " + evt.code + ".");  // Most likely 1000 (Normal Closure), or 1001 (Going Away)
            } else {
                console.error("Streaming disconnected with code " + evt.code + ".");
            }
        };
        connection.onerror = function (evt) {
            console.error(evt);
        };
        connection.onmessage = function (messageFrame) {
            const messages = parseMessageFrame(messageFrame.data);
            messages.forEach(messageCallback);
        };
        console.log("Connection subscribed to events. ReadyState: " + connection.readyState + ".");
    }

    function setupStreamer() {
        return Object.freeze({
            createConnection,
            startListener
        });
    }

    return setupStreamer();
}