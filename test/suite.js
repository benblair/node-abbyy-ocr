// Test suite for ABBYY's OCR-SDK. See http://ocrsdk.com/

var assert = require('assert');

var AbbyyOcr = require('../abbyy-ocr');

var appId = process.env.ABBYY_APPID;
var password = process.env.ABBYY_PASSWORD;

var ocr = new AbbyyOcr(appId, password);

describe('AbbyyOcr', function() {
    describe('#processImage', function() {
        it('should return the text in the sample image', function(done) {
            this.timeout(1000000); // set a high timeout, as terapeak is sometimes a bit slow to respond.
            var options = {
                imagePath: './test/sample_images/MobPhoto_4.jpg',
                statusCallback: function(err, status) { console.log(status); }
            };
            ocr.processImage(options, function(err, text) {
                if (err) {
                    assert.fail(err);
                }
                // This sample has a whole block of text. Let's just make sure some of the key phrases are present:
                assert(text.indexOf('Capture Front-ends Linked to Backend') > 0);
                done();
            });
        });
    });
});