/**
 * One-time seed script: uploads the initial exhibition to Oracle Cloud
 * as exhibitions/data.json so the exhibitions page isn't empty.
 *
 * Usage:
 *   cd server && node scripts/seed-exhibitions.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

const required = ['ORACLE_ACCESS_KEY_ID', 'ORACLE_SECRET_ACCESS_KEY', 'ORACLE_ENDPOINT', 'ORACLE_BUCKET_NAME'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error('Missing required environment variables:', missing.join(', '));
  process.exit(1);
}

const s3 = new AWS.S3({
  endpoint: process.env.ORACLE_ENDPOINT,
  s3ForcePathStyle: true,
  accessKeyId: process.env.ORACLE_ACCESS_KEY_ID,
  secretAccessKey: process.env.ORACLE_SECRET_ACCESS_KEY,
  region: 'eu-frankfurt-1',
});
const bucket = process.env.ORACLE_BUCKET_NAME;
const DATA_KEY = 'exhibitions/data.json';

const IMAGE_LOCAL_PATH = path.join(__dirname, '../../src/components/assets/ex.image1.jpg');
const IMAGE_KEY = 'exhibitions/images/ex.image1.jpg';

async function main() {
  // Check if data.json already exists
  try {
    await s3.headObject({ Bucket: bucket, Key: DATA_KEY }).promise();
    console.log('exhibitions/data.json already exists — skipping seed.');
    console.log('Delete it from Oracle first if you want to re-seed.');
    return;
  } catch (err) {
    if (err.code !== 'NotFound' && err.code !== 'NoSuchKey') throw err;
    // File doesn't exist — proceed with seed
  }

  // Upload the exhibition image
  console.log('Uploading exhibition image...');
  const imageBuffer = fs.readFileSync(IMAGE_LOCAL_PATH);
  await s3.putObject({
    Bucket: bucket,
    Key: IMAGE_KEY,
    Body: imageBuffer,
    ContentType: 'image/jpeg',
  }).promise();
  const imageUrl = `${process.env.ORACLE_ENDPOINT}/${bucket}/${IMAGE_KEY}`;
  console.log(`✅ Image uploaded: ${imageUrl}`);

  // Build and upload exhibitions data
  const exhibitions = [
    {
      id: '1',
      titleEn: 'BY THE TRAIL OF LIGHT',
      titleSr: 'TRAGOM SVETLOSTI',
      dateStart: '11 July 2025',
      dateEnd: '04 August 2025',
      openingTime: '18:00 h',
      locationEn: 'Gallery Singidunum, Knez Mihailova 40, Belgrade',
      locationSr: 'Galerija Singidunum, Knez Mihailova 40, Beograd',
      locationUrl: 'https://www.google.com/maps/search/?api=1&query=Gallery+Singidunum+Knez+Mihailova+40+Belgrade',
      noteEn: "Meet Dusan in person. We're waiting for you!",
      noteSr: 'Upoznajte i družite se sa Dušanom. Čekamo Vas!',
      imageUrl,
      imageKey: IMAGE_KEY,
      createdAt: '2025-07-11T00:00:00.000Z',
    },
  ];

  await s3.putObject({
    Bucket: bucket,
    Key: DATA_KEY,
    Body: JSON.stringify(exhibitions, null, 2),
    ContentType: 'application/json',
  }).promise();

  console.log('✅ Seeded exhibitions/data.json with 1 exhibition.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
