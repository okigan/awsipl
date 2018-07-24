'use strict';

console.log('Loading function');

const aws = require('aws-sdk');
const s3 = new aws.S3({apiVersion: '2006-03-01'});
const fs = require('fs');
const sharp = require('sharp');
const s3urls = require('@mapbox/s3urls');

function mapExt2MimeType(extention) {
    switch (extention) {
        case 'png':
            return 'image/png';
    }

    return "application/octet";
}


//https://github.com/awslabs/serverless-image-resizing/blob/master/lambda/index.js
exports.handler = (event, context, callback) => {


    console.log(JSON.stringify(event, null, 2));
    console.log(JSON.stringify(context, null, 2));
    console.log(JSON.stringify(callback, null, 2));

    if (event.body != null) {
        // api gateway
        console.log('processing as api gateway message');
        event = JSON.parse(event.body);
    }
    else if (event.Records != null) {
        if (event.Records[0].Sns != null) {
            console.log('processing as sns message');
            // sns event
            event = JSON.parse(event.Records[0].Sns.Message)
        } else if (event.Records[0].eventSource === 'aws:sqs') {
            console.log('processing as sqs message');
            // sns event
            event = JSON.parse(event.Records[0].body)
        }
    }

    console.log(JSON.stringify(event, null, 2));

    const source = event.source;
    const destination = event.destination;
    const width = event.width || 100;
    const height = event.height || 100;
    const format = event.format || 'png';
    const contentType = mapExt2MimeType(format);

    s3.getObject(s3urls.fromUrl(source))
        .promise()
        .then(data => sharp(data.Body)
            .resize(width, height)
            .toFormat(format)
            .toBuffer()
        )
        .then(buffer => s3.putObject({
            Bucket: s3urls.fromUrl(destination).Bucket,
            Key: s3urls.fromUrl(destination).Key,
            Body: buffer,
            ContentType: contentType,
        }).promise())
        .then(() => callback(null, {
            statusCode: 200,
            headers: {'location': `somehost/${s3urls.fromUrl(destination).Key}`},
            body: 'complete',
            isBase64Encoded: false
        }))
        .catch(err => callback(err));

};
