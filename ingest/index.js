'use strict';

function log(message) {
    console.log(message);
}

log('Loading function');

const doc = require('dynamodb-doc');

const dynamo = new doc.DynamoDB();

const aws = require('aws-sdk');
// const dynamoDB = aws.DynamoDB({apiVersion: '2012-08-10'});
const s3 = new aws.S3({apiVersion: '2006-03-01'});
const lambda = new aws.Lambda();
const stepfunctions = new aws.StepFunctions();

const uuidv4 = require('uuid/v4');


let environment = process.env.NODE_ENV;
let convertArn = process.env.CONVERT_ARN;

function handler(event, context, callback) {
    log('Received event:', JSON.stringify(event, null, 2));

    if (event.body != null) {
        // api gateway
        log('processing as api gateway message');
        event = JSON.parse(event.body);
    }

    const operation = event.operation;
    const payload = event.payload;

    switch (operation) {
        case 'create':
            const sourceFileId = uuidv4();
            payload.Item.source_file_id = sourceFileId;
            dynamo
                .putItem(payload)
                .promise()
                .then((a) => {

                    const image_type = payload.Item.image_type;

                    const params = {
                        TableName: "awsipl_config",
                        KeyConditions: [dynamo.Condition("image_type", "EQ", image_type)]
                    };

                    dynamo.query(params, (dummy, result) => {
                        result.Items.forEach(item => {
                            log(`processing: ${JSON.stringify(item)}`);

                            const destination = `s3://awsipl/${payload.Item.source_file_id}/${uuidv4()}from_lambda.jpg`;
                            const request = {
                                source: 's3://awsipl/aws-logo-100584713-primary.idge.jpg',
                                destination: destination,
                                width: item.config.width,
                                height: item.config.height
                            };

                            const invokeParams = {
                                ClientContext: JSON.stringify({calledFrom: context}),
                                FunctionName: convertArn,
                                InvocationType: 'Event',
                                LogType: 'Tail',
                                Payload: JSON.stringify(request),
                                Qualifier: '$LATEST'
                            };

                            lambda
                                .invoke(invokeParams)
                                .promise()
                                .then(data => {
                                    log(`invoke response: ${JSON.stringify(data)}`); // successful response

                                    dynamo
                                        .putItem({
                                            TableName: 'awsipl_derivative',
                                            Item: {
                                                derivative_file_id: uuidv4(),
                                                source_file_id: sourceFileId,
                                                image_type: image_type,
                                                destination: destination,
                                                task: {
                                                    invokeParams: invokeParams,
                                                    requestId: data.$response.requestId
                                                }
                                            }
                                        })
                                        .promise();
                                })
                                .catch(err => {
                                    log(err, err.stack);
                                });

                        });
                    });


                })
                .then(() => callback(null, {statusCode: 200, body: 'done'}))
                .catch(err => callback(err))
            ;
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
            callback(new Error(`Unrecognized operation '${operation}'`));
    }
}

/**
 * Provide an event that contains the following keys:
 *
 *   - operation: one of the operations in the switch statement below
 *   - tableName: required for operations that interact with DynamoDB
 *   - payload: a parameter to pass to the operation being performed
 */
exports.handler = handler;


