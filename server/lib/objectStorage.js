/**
 * Shared object storage helper for S3-compatible backends (AWS S3 or Oracle Cloud Object Storage).
 * When OBJECT_STORAGE_PROVIDER=oracle or OBJECT_STORAGE_ENDPOINT is set, configures the AWS SDK
 * for Oracle's S3-compatible API. Otherwise uses default AWS S3.
 */
const AWS = require('aws-sdk');

function createS3Client() {
  const isOracle =
    process.env.OBJECT_STORAGE_PROVIDER === 'oracle' || process.env.OBJECT_STORAGE_ENDPOINT;

  if (isOracle) {
    return new AWS.S3({
      endpoint: process.env.OBJECT_STORAGE_ENDPOINT,
      s3ForcePathStyle: true,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });
  return new AWS.S3();
}

/**
 * Returns the public URL for an object key.
 * Uses OBJECT_STORAGE_PUBLIC_BASE_URL when set (Oracle), otherwise builds AWS S3 URL.
 */
function getImageUrl(key) {
  const base = process.env.OBJECT_STORAGE_PUBLIC_BASE_URL;
  const bucketName = process.env.S3_BUCKET_NAME;
  if (base) {
    const baseTrimmed = base.endsWith('/') ? base : base + '/';
    return baseTrimmed + key;
  }
  return `https://${bucketName}.s3.amazonaws.com/${key}`;
}

const s3 = createS3Client();

module.exports = {
  getClient: () => s3,
  getImageUrl,
};
