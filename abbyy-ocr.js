
var ocrsdkModule = require('./ocrsdk.js');

function AbbyyOcr(appId, password) {
    this.ocrsdk = ocrsdkModule.create(appId, password);
	this.ocrsdk.serverUrl = "https://cloud.ocrsdk.com";
}


AbbyyOcr.prototype.processImage = function (imageData, settings, callback) {
	var self = this;
	
	var ocrSettings = new ocrsdkModule.ProcessingSettings();
	ocrSettings.language = settings.language ? settings.language : "English";
	ocrSettings.exportFormat = settings.exportFormat ? settings.exportFormat : "txt";
	
	this.ocrsdk.processImage(imageData, ocrSettings, function(err, task) {
		if (err) {
			callback(err, null);
		} else {
			self.uploadCompleted(task, callback);
		}
	});
}

AbbyyOcr.prototype.uploadCompleted = function (taskData, callback) {
	var self = this;
	this.ocrsdk.waitForCompletion(taskData.id, function(err, taskData) {
		if (err) {
			callback(err, null);
		} else {
			self.processingCompleted(taskData, callback);
		}
	});
}

AbbyyOcr.prototype.processingCompleted = function (taskData, callback) {
	var self = this;
	if (taskData.status != "Completed") {
		callback(new Error("Image processing did not complete: " + taskData.error), null);
	} else {
		this.ocrsdk.fetchResult(taskData.resultUrl, function(err, data) {
			callback(err, data);
		});
	}
}


module.exports = AbbyyOcr;
