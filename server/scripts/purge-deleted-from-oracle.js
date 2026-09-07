/**
 * One-time cleanup script: permanently delete all objects in Oracle Cloud
 * that were soft-deleted (metadata.deleted === 'true').
 *
 * Usage:
 *   cd server && node scripts/purge-deleted-from-oracle.js
 *
 * Add --dry-run to preview what would be deleted without actually deleting:
 *   node scripts/purge-deleted-from-oracle.js --dry-run
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const AWS = require('aws-sdk');

const required = ['ORACLE_ACCESS_KEY_ID', 'ORACLE_SECRET_ACCESS_KEY', 'ORACLE_ENDPOINT', 'ORACLE_BUCKET_NAME'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error('Missing required environment variables:', missing.join(', '));
  process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');

const s3 = new AWS.S3({
  endpoint: process.env.ORACLE_ENDPOINT,
  s3ForcePathStyle: true,
  accessKeyId: process.env.ORACLE_ACCESS_KEY_ID,
  secretAccessKey: process.env.ORACLE_SECRET_ACCESS_KEY,
  region: 'eu-frankfurt-1',
});
const bucket = process.env.ORACLE_BUCKET_NAME;
const FOLDERS = ['available', 'sold'];

async function listAllObjects(folder) {
  const keys = [];
  let continuationToken;

  do {
    const response = await s3.listObjectsV2({
      Bucket: bucket,
      Prefix: `${folder}/`,
      ContinuationToken: continuationToken,
    }).promise();

    for (const obj of response.Contents || []) {
      if (!obj.Key.endsWith('/')) keys.push(obj.Key);
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

async function main() {
  console.log(`Mode:   ${dryRun ? 'DRY RUN (nothing will be deleted)' : 'LIVE'}`);
  console.log(`Bucket: ${bucket}`);
  console.log('');

  let totalFound = 0;
  let totalDeleted = 0;
  let totalFailed = 0;

  for (const folder of FOLDERS) {
    console.log(`--- Scanning ${folder}/ ---`);
    const keys = await listAllObjects(folder);
    console.log(`Found ${keys.length} object(s)`);

    for (const key of keys) {
      try {
        const head = await s3.headObject({ Bucket: bucket, Key: key }).promise();
        const deleted = head.Metadata?.deleted;

        if (deleted === 'true') {
          totalFound++;
          console.log(`  🗑️  ${key}`);

          if (!dryRun) {
            await s3.deleteObject({ Bucket: bucket, Key: key }).promise();
            totalDeleted++;
          }
        }
      } catch (err) {
        console.error(`  ✗  ${key}  →  ${err.message}`);
        totalFailed++;
      }
    }

    console.log('');
  }

  console.log('=== Done ===');
  console.log(`Marked as deleted: ${totalFound}`);
  if (!dryRun) {
    console.log(`Permanently deleted: ${totalDeleted}`);
    console.log(`Failed:             ${totalFailed}`);
  } else {
    console.log('Run without --dry-run to permanently delete the above objects.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
