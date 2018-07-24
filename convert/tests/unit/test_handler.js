'use strict';

const app = require('../../index.js');
const chai = require('chai');
const expect = chai.expect;


describe('Tests index', function () {
    it('verifies successful response', async () => {
        let event = {
                "source": "s3://awsipl/aws-logo-100584713-primary.idge.jpg",
                "destination": "s3://awsipl/aws-logo-100584713-primary.idge.resized.jpg"
            },
            context = {}
            ;

        const result = await app.handler(event, context, (err, result) => {
            expect(result).to.be.an('object');
            expect(result.statusCode).to.equal(200);
            expect(result.body).to.be.an('string');

            let response = JSON.parse(result.body);

            expect(response).to.be.an('object');
            expect(response.message).to.be.equal("hello world");
            expect(response.location).to.be.an("string");
        });
    });
});

