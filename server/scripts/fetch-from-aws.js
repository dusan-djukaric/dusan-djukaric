/**
 * Fetch all pictures from AWS S3 to local disk.
 *
 * Downloads every image from the available/ and sold/ folders,
 * preserving the folder structure. Also writes a manifest.json
 * with all metadata for every image.
 *
 * Output structure:
 *   server/downloads/
 *   ├── available/
 *   │   ├── 8754321234567.jpg
 *   │   └── ...
 *   ├── sold/
 *   │   └── ...
 *   └── manifest.json        ← all metadata, keyed by S3 key
 *
 * Usage:
 *   cd server && node scripts/fetch-from-aws.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// --- Validate required env vars ---
const required = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'S3_BUCKET_NAME'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error('Missing required environment variables:', missing.join(', '));
  console.error('Make sure server/.env has all AWS credentials filled in.');
  process.exit(1);
}

// --- AWS client ---
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
const bucket = process.env.S3_BUCKET_NAME;

// --- Output directory ---
const OUTPUT_DIR = path.join(__dirname, '../downloads');
const FOLDERS = ['available', 'sold'];

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

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
      if (!obj.Key.endsWith('/')) { // skip folder placeholder objects
        keys.push(obj.Key);
      }
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

async function downloadObject(key) {
  // Fetch metadata
  const head = await s3.headObject({ Bucket: bucket, Key: key }).promise();

  // Fetch file body
  const { Body } = await s3.getObject({ Bucket: bucket, Key: key }).promise();

  // Save file to disk
  const filePath = path.join(OUTPUT_DIR, key);
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, Body);

  return {
    key,
    contentType: head.ContentType,
    size: head.ContentLength,
    lastModified: head.LastModified,
    metadata: head.Metadata || {},
  };
}

async function main() {
  console.log(`Bucket: ${bucket} (${process.env.AWS_REGION})`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log('');

  ensureDir(OUTPUT_DIR);

  const manifest = {};
  let totalDownloaded = 0;
  let totalFailed = 0;
  let totalBytes = 0;

  for (const folder of FOLDERS) {
    console.log(`--- Listing ${folder}/ ---`);
    const keys = await listAllObjects(folder);
    console.log(`Found ${keys.length} image(s)`);

    for (const key of keys) {
      try {
        const result = await downloadObject(key);
        manifest[key] = {
          contentType: result.contentType,
          size: result.size,
          lastModified: result.lastModified,
          metadata: result.metadata,
        };
        totalBytes += result.size;
        totalDownloaded++;
        console.log(`  ✓  ${key}  (${(result.size / 1024).toFixed(1)} KB)`);
      } catch (err) {
        console.error(`  ✗  ${key}  →  ${err.message}`);
        totalFailed++;
      }
    }

    console.log('');
  }

  // Write manifest
  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log('=== Done ===');
  console.log(`Downloaded: ${totalDownloaded} image(s) — ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Failed:     ${totalFailed}`);
  console.log(`Manifest:   ${manifestPath}`);

  if (totalFailed > 0) {
    console.error('\nSome downloads failed. Check the errors above.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
