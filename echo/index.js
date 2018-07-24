'use strict';

console.log('Loading function');

exports.handler = (event, context, callback) => {
    //console.log('Received event:', JSON.stringify(event, null, 2));
    console.log('value1 =', event.key1);
    console.log('value2 =', event.key2);
    console.log('value3 =', event.key3);

    const result = {
        timestamp: new Date(),
        env: process.env
    };

    callback(null, {
        statusCode: 200,
        body: JSON.stringify(result),
        headers: {"Content-Type": "application/json"},
        isBase64Encoded: false
    });

};
