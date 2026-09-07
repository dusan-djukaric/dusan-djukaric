/**
 * Upload all locally downloaded pictures to Oracle Cloud Object Storage.
 *
 * Reads files from server/downloads/ (available/ and sold/ folders)
 * and uploads them to Oracle with the original metadata from manifest.json.
 *
 * Usage:
 *   cd server && node scripts/upload-to-oracle.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// --- Validate required env vars ---
const required = ['ORACLE_ACCESS_KEY_ID', 'ORACLE_SECRET_ACCESS_KEY', 'ORACLE_ENDPOINT', 'ORACLE_BUCKET_NAME'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error('Missing required environment variables:', missing.join(', '));
  process.exit(1);
}

// --- Oracle Cloud client (S3-compatible) ---
const s3 = new AWS.S3({
  endpoint: process.env.ORACLE_ENDPOINT,
  s3ForcePathStyle: true,
  accessKeyId: process.env.ORACLE_ACCESS_KEY_ID,
  secretAccessKey: process.env.ORACLE_SECRET_ACCESS_KEY,
  region: 'eu-frankfurt-1',
});
const bucket = process.env.ORACLE_BUCKET_NAME;

const DOWNLOADS_DIR = path.join(__dirname, '../downloads');
const FOLDERS = ['available', 'sold'];

// --- Load manifest ---
const manifestPath = path.join(DOWNLOADS_DIR, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error('manifest.json not found. Run fetch-from-aws.js first.');
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

async function uploadFile(key) {
  const filePath = path.join(DOWNLOADS_DIR, key);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found on disk: ${filePath}`);
  }

  const fileBuffer = fs.readFileSync(filePath);
  const entry = manifest[key] || {};

  await s3.putObject({
    Bucket: bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: entry.contentType || 'image/jpeg',
    Metadata: entry.metadata || {},
  }).promise();

  return entry.size || fileBuffer.length;
}

async function main() {
  console.log(`Destination: ${process.env.ORACLE_ENDPOINT}/${bucket}`);
  console.log(`Source:      ${DOWNLOADS_DIR}`);
  console.log('');

  let totalUploaded = 0;
  let totalFailed = 0;
  let totalBytes = 0;

  for (const folder of FOLDERS) {
    const folderPath = path.join(DOWNLOADS_DIR, folder);

    if (!fs.existsSync(folderPath)) {
      console.log(`--- ${folder}/ not found, skipping ---`);
      continue;
    }

    const files = fs.readdirSync(folderPath);
    console.log(`--- Uploading ${folder}/ — ${files.length} image(s) ---`);

    for (const filename of files) {
      const key = `${folder}/${filename}`;
      try {
        const size = await uploadFile(key);
        totalBytes += size;
        totalUploaded++;
        console.log(`  ✓  ${key}  (${(size / 1024).toFixed(1)} KB)`);
      } catch (err) {
        console.error(`  ✗  ${key}  →  ${err.message}`);
        totalFailed++;
      }
    }

    console.log('');
  }

  console.log('=== Done ===');
  console.log(`Uploaded: ${totalUploaded} image(s) — ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Failed:   ${totalFailed}`);

  if (totalFailed > 0) {
    console.error('\nSome uploads failed. Check the errors above and re-run — already uploaded files will just overwrite cleanly.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
