
// Node module for calling ABBYY's OCR-SDK. See http://ocrsdk.com/

var fs = require('fs');
var request = require('request');
var querystring = require('querystring');
var xml2js = require('xml2js');

var HOST = 'cloud.ocrsdk.com';
var UPLOAD_PATH = '/processImage';
var TASK_CHECK_PATH = '/getTaskStatus';
var TASK_SUCCESS_STATE = 'Completed';
var TERMINAL_TASK_STATES = [TASK_SUCCESS_STATE, 'ProcessingFailed', 'NotEnoughCredits'];
var DEFAULT_TIMEOUT = 60 * 1000; // 60 seconds
var TASK_CHECK_INTERVAL = 1000;  // 1 second

function AbbyyOcr(appId, password) {
    this.appId = appId;
    this.password = password;
}

// Specify options.image with raw image data, or options.imagePath with path to image

AbbyyOcr.prototype.processImage = function (options, callback) {
    
    var self = this;

    if (!options || !callback) {
        throw new Error('Must specify options and callback to processImage');
    }

    var opts =  {
        language: 'English' || options.language,
        exportFormat: 'txt' || options.exportFormat,
        customOptions: options.customOptions,
        timeout: Date.now() + (options.timeout || DEFAULT_TIMEOUT),
        statusCallback: options.statusCallback,
        outputPath: options.outputPath
    };

    self._uploadImage(options, parseTaskStatus(options, function(err, task) {
        if (err) {
            callback(err);
            return;
        }
        self._waitForTask(options, task, callback);
    }));
};

AbbyyOcr.prototype._getUrl = function(path) {
    return 'https://' + HOST + path;
};

AbbyyOcr.prototype._getRequestQueryString = function(options) {

    var query = {
        language: 'English' || options.language,
        exportFormat: 'txt' || options.exportFormat
    };

    var qs = querystring.stringify(query);

    if (options.customOptions) {
        if (typeof (options.customOptions) === 'string') {
            qs += '+' + options.customOptions;
        } else {
            qs += '+' + querystring.stringify(options.customOptions);
        }
    }

    return qs;
};

AbbyyOcr.prototype._uploadImage = function(options, callback) {
    
    var self = this;
    var url =  self._getUrl(UPLOAD_PATH) + '?' + self._getRequestQueryString(options);

    if (options.image) {
        // already got the raw image data, just post it
        request.post({ url: url, body: options.image }, callback);
        return;
    }

    if (!options.imagePath) {
        callback('Must specify image or imagePath');
        return;
    }

    fs.exists(options.imagePath, function(exists) {
        if (!exists) {
            callback('File not found at "' + options.imagePath + '".');
            return;
        }

        fs.stat(options.imagePath, function(err, stats) {
            if (err) {
                callback(err);
                return;
            }

            fs.createReadStream(options.imagePath).pipe(request.post({url: url, auth: self.appId + ':' + self.password}, callback));
        });
    });
};

AbbyyOcr.prototype._checkTask = function(options, task, callback) {

    var self = this;

    var url = self._getUrl(TASK_CHECK_PATH) + '?taskId=' + task.id;
    request.get({url: url, auth: self.appId + ':' + self.password}, parseTaskStatus(options, function(err, task) {
        if (err) {
            callback(err);
            return;
        }
        self._waitForTask(options, task, callback);
    }));
};

AbbyyOcr.prototype._waitForTask = function(options, task, callback) {

    var self = this;

    var status = task.status;

    if (options.statusCallback) {
        options.statusCallback(null, task.status);
    }

    if (status === TASK_SUCCESS_STATE) {
        self._getResults(options, task, callback);
        return;
    }

    if (TERMINAL_TASK_STATES.indexOf(status) >= 0) {
        callback(status);
        return;
    }

    if (Date.now() > options.timeout) {
        callback('Timeout expired');
        return;
    }

    setTimeout(function() {
        self._checkTask(options, task, callback);
    }, TASK_CHECK_INTERVAL);
};

AbbyyOcr.prototype._getResults = function(options, task, callback) {

    var self = this;

    var taskId = task.id;
    var resultUrl = task.resultUrl;

    if (options.outputPath) {
        var outputStream = fs.createWriteStream(options.outputPath);
        request(task.resultUrl).pipe(outputStream);
        outputStream.on('end', callback);
        return;
    }

    request(task.resultUrl, function(err, response, body) {
        if (err) {
            callback(err);
            return;
        }

        if (response.statusCode !== 200) {
            callback('Server error ' + response.statusCode + '. ' + body);
            return;
        }

        callback(null, body);
    });
};

function parseTaskStatus(options, callback) {
    return function(err, response, body) {

        debugger;
        if (err) {
            callback(err);
            return;
        }

        if (response.statusCode !== 200) {
            callback('Server error ' + response.statusCode + '. ' + body);
            return;
        }

        var parser = new xml2js.Parser({
            explicitCharKey : false,
            trim : true,
            explicitRoot : true,
            mergeAttrs : true
        });
        
        parser.parseString(body, function(err, response) {
            if (err) {
                callback(err);
                return;
            }

            if (response === null || 
                response.response === null || 
                response.response.task === null ||
                response.response.task.length <= 0 ||
                response.response.task[0] === null) {
                if (response.error) {
                    callback(response.error);
                } else {
                    callback('Error parsing upload response: ' + body);
                }
                return;
            }

            callback(null, response.response.task[0]);

        });
    }
}

module.exports = AbbyyOcr;