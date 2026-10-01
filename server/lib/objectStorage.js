const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  endpoint: process.env.ORACLE_ENDPOINT,
  s3ForcePathStyle: true,
  accessKeyId: process.env.ORACLE_ACCESS_KEY_ID,
  secretAccessKey: process.env.ORACLE_SECRET_ACCESS_KEY,
  region: 'eu-frankfurt-1',
});

const bucket = process.env.ORACLE_BUCKET_NAME;

const objectUrl = (key) => `${process.env.ORACLE_ENDPOINT}/${bucket}/${key}`;

module.exports = { s3, bucket, objectUrl };
