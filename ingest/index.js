'use strict';

console.log('Loading function');
const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();

const aws = require('aws-sdk');
const s3 = new aws.S3({ apiVersion: '2006-03-01' });
const lambda = new aws.Lambda();

const uuidv4 = require('uuid/v4');


let environment = process.env.NODE_ENV;
let convertArn = process.env.CONVERT_ARN;

/**
 * Provide an event that contains the following keys:
 *
 *   - operation: one of the operations in the switch statement below
 *   - tableName: required for operations that interact with DynamoDB
 *   - payload: a parameter to pass to the operation being performed
 */
exports.handler = (event, context, callback) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    const operation = event.operation;
    const payload = event.payload;

    if (event.tableName) {
        payload.TableName = event.tableName;
    }

    switch (operation) {
        case 'create':
            payload.source_file_id = uuidv4();
            dynamo.putItem(payload, callback);
            break;
        case 'read':
            dynamo.getItem(payload, callback);
            break;
        case 'update':
            dynamo.updateItem(payload, callback);
            break;
        case 'delete':
            dynamo.deleteItem(payload, callback);
            break;
        case 'list':
            dynamo.scan(payload, callback);
            break;
        case 'echo':
            callback(null, payload);
            break;
        case 'ping':
            callback(null, 'pong');
            break;
        default:
            callback(new Error(`Unrecognized operation "${operation}"`));
    }

    const request = {
        "source": "s3://awsipl/aws-logo-100584713-primary.idge.jpg",
        "destination": "s3://awsipl/aws-logo-100584713-primary.idge.resized.from_lambda.jpg"
    };

    const params = {
        ClientContext: "MyApp",
        FunctionName: "arn:aws:lambda:us-east-1:073856810203:function:cloud9-awsipl-convert-11J40S1TCVGVY",
        InvocationType: "Event",
        LogType: "Tail",
        Payload: JSON.stringify(request),
        Qualifier: "$LATEST"
    };

    lambda.invoke(params, function(err, data) {
        if (err) {
            // an error occurred
            console.log(err, err.stack);
        }
        else {
            console.log(data); // successful response
        }
    });
};
