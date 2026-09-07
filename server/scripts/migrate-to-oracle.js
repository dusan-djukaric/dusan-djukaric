/**
 * Migration script: AWS S3 → Oracle Cloud Object Storage
 *
 * Copies all objects from the AWS S3 bucket (available/ and sold/ folders)
 * to an Oracle Cloud bucket, preserving keys, ContentType, and all metadata.
 *
 * Required environment variables (add to server/.env before running):
 *
 *   # AWS source
 *   AWS_ACCESS_KEY_ID=...
 *   AWS_SECRET_ACCESS_KEY=...
 *   AWS_REGION=eu-central-1
 *   S3_BUCKET_NAME=ddjpictures
 *
 *   # Oracle Cloud destination
 *   ORACLE_ACCESS_KEY_ID=...
 *   ORACLE_SECRET_ACCESS_KEY=...
 *   ORACLE_ENDPOINT=https://<namespace>.compat.objectstorage.<region>.oraclecloud.com
 *   ORACLE_BUCKET_NAME=<target-bucket-name>
 *
 * Usage:
 *   cd server && node scripts/migrate-to-oracle.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const AWS = require('aws-sdk');

// --- Validate required env vars ---
const required = [
  'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'S3_BUCKET_NAME',
  'ORACLE_ACCESS_KEY_ID', 'ORACLE_SECRET_ACCESS_KEY', 'ORACLE_ENDPOINT', 'ORACLE_BUCKET_NAME',
];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error('Missing required environment variables:', missing.join(', '));
  process.exit(1);
}

// --- Source: AWS S3 ---
const sourceS3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
const sourceBucket = process.env.S3_BUCKET_NAME;

// --- Destination: Oracle Cloud (S3-compatible) ---
const destS3 = new AWS.S3({
  endpoint: process.env.ORACLE_ENDPOINT,
  s3ForcePathStyle: true,
  accessKeyId: process.env.ORACLE_ACCESS_KEY_ID,
  secretAccessKey: process.env.ORACLE_SECRET_ACCESS_KEY,
  region: 'us-east-1', // Oracle ignores this but SDK requires a value
});
const destBucket = process.env.ORACLE_BUCKET_NAME;

const FOLDERS = ['available', 'sold'];

async function listAllObjects(folder) {
  const keys = [];
  let continuationToken;

  do {
    const params = {
      Bucket: sourceBucket,
      Prefix: `${folder}/`,
      ContinuationToken: continuationToken,
    };
    const response = await sourceS3.listObjectsV2(params).promise();
    for (const obj of response.Contents || []) {
      // Skip folder placeholder objects (zero-byte keys ending with /)
      if (!obj.Key.endsWith('/')) {
        keys.push(obj.Key);
      }
    }
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

async function migrateObject(key) {
  // 1. Get metadata from source
  const head = await sourceS3.headObject({ Bucket: sourceBucket, Key: key }).promise();

  // 2. Get object body from source
  const { Body } = await sourceS3.getObject({ Bucket: sourceBucket, Key: key }).promise();

  // 3. Write to destination with same key, ContentType, and all metadata
  await destS3.putObject({
    Bucket: destBucket,
    Key: key,
    Body,
    ContentType: head.ContentType,
    Metadata: head.Metadata || {},
  }).promise();
}

async function main() {
  console.log(`Source:      s3://${sourceBucket}`);
  console.log(`Destination: ${process.env.ORACLE_ENDPOINT}/${destBucket}`);
  console.log('');

  let totalCopied = 0;
  let totalFailed = 0;

  for (const folder of FOLDERS) {
    console.log(`--- Listing ${folder}/ ---`);
    const keys = await listAllObjects(folder);
    console.log(`Found ${keys.length} object(s) in ${folder}/`);

    for (const key of keys) {
      try {
        await migrateObject(key);
        console.log(`  ✓  ${key}`);
        totalCopied++;
      } catch (err) {
        console.error(`  ✗  ${key}  →  ${err.message}`);
        totalFailed++;
      }
    }

    console.log('');
  }

  console.log('=== Migration complete ===');
  console.log(`Copied:  ${totalCopied}`);
  console.log(`Failed:  ${totalFailed}`);

  if (totalFailed > 0) {
    console.error('\nSome objects failed to migrate. Check the errors above and re-run if needed.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
