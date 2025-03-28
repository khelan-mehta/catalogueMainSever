import aws from 'aws-sdk';

const region = "eu-north-1";
const bucketName = "direct-upload-s3-khelan";
const accessKeyId = "AKIAVVANBAJNCJ3LVIJC";
const secretAccessKey = "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";

const s3 = new aws.S3({
    region,
    accessKeyId,
    secretAccessKey,
    signatureVersion: '4'
});
