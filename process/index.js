'use strict';

const im = require('imagemagick');
const gm = require('gm').subClass({imageMagick: true});
const fs = require('fs');
var AWS = require('aws-sdk');
const S3 = new AWS.S3({ signatureVersion: 'v4' });
const s3urls = require('@mapbox/s3urls');


const postProcessResource = (resource, fn) => {
    let ret = null;
    if (resource) {
        if (fn) {
            ret = fn(resource);
        }
        try {
            fs.unlinkSync(resource);
        }
        catch (err) {
            // Ignore
        }
    }
    return ret;
};


const identify = (req, callback) => {
    if (!req.base64Image) {
        const msg = 'Invalid identify request: no "base64Image" field supplied';
        console.log(msg);
        return callback(msg);
    }
    const tmpFile = `/tmp/inputFile.${(req.inputExtension || 'png')}`;
    const buffer = new Buffer(req.base64Image, 'base64');
    fs.writeFileSync(tmpFile, buffer);
    const args = req.customArgs ? req.customArgs.concat([tmpFile]) : tmpFile;
    im.identify(args, (err, output) => {
        fs.unlinkSync(tmpFile);
        if (err) {
            console.log('Identify operation failed:', err);
            callback(err);
        }
        else {
            console.log('Identify operation completed successfully');
            callback(null, output);
        }
    });
};

function resizeS3(req, callback) {
    const source = req.source;
    const dest = req.destination;
    const width = req.width;
    const height = req.height;

    const tmpSrc = `/tmp/src`;
    const tmpDst = `/tmp/dst`;

    var x = S3
    .getObject(s3urls.fromUrl(source))
    .createReadStream()
    .pipe(fs.createWriteStream(tmpSrc));

    im.resize({
            width: width,
            height: height,
            srcPath: tmpSrc,
            dstPath: tmpDst
        },
        (err, stdout, stderr) => {
            if (err) throw err;
            
            console.log('resized kittens.jpg to fit within 256x256px');
        });
    console.log(`resized "${tmpSrc}"`);

    S3.putObject({
        Bucket: s3urls.fromUrl(dest).Bucket,
        Key: s3urls.fromUrl(dest).Key,
        Body: fs.createReadStream(tmpDst),
        ContentType: 'image/png'
    });
    
        //     .then(() => callback(null, {
        //     statusCode: '301',
        //     headers: { 'location': dest },
        //     body: '',
        // }))
        // .catch(err => callback(err));



}

const resize = (req, callback) => {
    const resizeReq = req;
    if (!resizeReq.base64Image) {
        const msg = 'Invalid resize request: no "base64Image" field supplied';
        console.log(msg);
        return callback(msg);
    }
    // If neither height nor width was provided, turn this into a thumbnailing request
    if (!resizeReq.height && !resizeReq.width) {
        resizeReq.width = 100;
    }
    const resizedFile = `/tmp/resized.${(resizeReq.outputExtension || 'png')}`;
    const buffer = new Buffer(resizeReq.base64Image, 'base64');
    delete resizeReq.base64Image;
    delete resizeReq.outputExtension;
    resizeReq.srcData = buffer;
    resizeReq.dstPath = resizedFile;

    try {
        im.resize({
            srcPath: 'kittens.jpg',
            dstPath: 'kittens-small.jpg',
            width: 256
        }, (err) => {
            if (err) {
                throw err;
            }
            else {
                console.log('Resize operation completed successfully');
                callback("hello", postProcessResource(resizedFile, (file) => new Buffer(fs.readFileSync(file)).toString('base64')));
            }
        });
    }
    catch (err) {
        console.log('Resize operation failed:', err);
        callback(err);
    }
};

const convert = (req, callback) => {
    const customArgs = req.customArgs || [];
    let inputFile = null;
    let outputFile = null;
    if (req.base64Image) {
        inputFile = `/tmp/inputFile.${(req.inputExtension || 'png')}`;
        const buffer = new Buffer(req.base64Image, 'base64');
        fs.writeFileSync(inputFile, buffer);
        customArgs.unshift(inputFile);
    }
    if (req.outputExtension) {
        outputFile = `/tmp/outputFile.${req.outputExtension}`;
        customArgs.push(outputFile);
    }
    im.convert(customArgs, (err, output) => {
        if (err) {
            console.log('Convert operation failed:', err);
            callback(err);
        }
        else {
            console.log('Convert operation completed successfully');
            postProcessResource(inputFile);
            if (outputFile) {
                callback(null, postProcessResource(outputFile, (file) => new Buffer(fs.readFileSync(file)).toString('base64')));
            }
            else {
                // Return the command line output as a debugging aid
                callback(null, output);
            }
        }
    });
};


exports.handler = (event, context, callback) => {
    const req = event;
    const operation = req.operation;
    delete req.operation;
    if (operation) {
        console.log(`Operation ${operation} 'requested`);
    }

    switch (operation) {
        case 'ping':
            callback(null, 'pong');
            break;
        case 'getDimensions':
            req.customArgs = ['-format', '%wx%h'];
            /* falls through */
        case 'identify':
            identify(req, callback);
            break;
        case 'thumbnail': // Synonym for resize
        case 'resize':
            resize(req, callback);
            break;
        case 'resizeS3':
            resizeS3(req, callback);
            break;
        case 'getSample':
            req.customArgs = ['rose:'];
            req.outputExtension = req.outputExtension || 'png';
            /* falls through */
        case 'convert':
            convert(req, callback);
            break;
        default:
            callback(new Error(`Unrecognized operation "${operation}"`));
    }
};
