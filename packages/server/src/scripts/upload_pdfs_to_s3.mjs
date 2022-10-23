import AWS from "aws-sdk";
import path from "path"
import fs from "fs"

const directoryPath = "../../../user-data/pdfs/"

const S3 = new AWS.S3()

fs.readdir(directoryPath, function (err, files) {
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    } 
    files.forEach(async filename =>  {

        const fileStream = fs.createReadStream(path.join(directoryPath, filename))
        const params = {
            Bucket: "inck-pdfs",
            Key: filename,
            Body: fileStream,
        }

        await S3.upload(params).promise()
    });
});

