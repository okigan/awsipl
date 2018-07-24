'use strict';

function log(message) {
    console.log(JSON.stringify(message, null, 2));
}

log('Loading function');

function handler(event, context, callback) {
    console.log('value1 =', event.key1);
    console.log('value2 =', event.key2);
    console.log('value3 =', event.key3);

    const result = {
        timestamp: new Date(),
        env: process.env,
        event: event,
        context: context
    };

    callback(null, {
        statusCode: 200,
        body: JSON.stringify(result),
        headers: {"Content-Type": "application/json"},
        isBase64Encoded: false
    });

}


exports.handler = handler;

