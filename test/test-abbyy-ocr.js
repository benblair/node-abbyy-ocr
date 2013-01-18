// Demo sample using ABBYY Cloud OCR SDK from Node.js

var AbbyyOcr = require('../abbyy-ocr');

var appId = process.env.ABBYY_APPID;
var password = process.env.ABBYY_PASSWORD;

var imagePath = 'image.jpg';
var outputPath = 'result.txt';

try {
	console.log("ABBYY Cloud OCR SDK Sample for Node.js");

	var abbyy = new Eyeball(appId, password);

	var imageData = {
		filePath: "image.jpg"
	};
	var settings = {
		language: "English",
		exportFormat: "txt"
	};
	
	abbyy.processImage(imageData, settings, function(err, data){
		if (err) {
			console.log("Error:" + err.message);
		} else {
			console.log("Got Data:");
			console.log(data);
		}
	});



} catch (err) {
	console.log("Error: " + err.message);
}
