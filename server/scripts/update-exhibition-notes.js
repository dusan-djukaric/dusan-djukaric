require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  endpoint: process.env.ORACLE_ENDPOINT,
  s3ForcePathStyle: true,
  accessKeyId: process.env.ORACLE_ACCESS_KEY_ID,
  secretAccessKey: process.env.ORACLE_SECRET_ACCESS_KEY,
  region: 'eu-frankfurt-1',
});
const bucket = process.env.ORACLE_BUCKET_NAME;
const KEY = 'exhibitions/data.json';

async function main() {
  const result = await s3.getObject({ Bucket: bucket, Key: KEY }).promise();
  const exhibitions = JSON.parse(result.Body.toString());

  exhibitions[0].noteEn = "Meet Dusan in person. We're waiting for you!\nStay tuned for more updates about our upcoming exhibitions.";
  exhibitions[0].noteSr = "Upoznajte i družite se sa Dušanom. Čekamo Vas!\nPratite nas za više informacija o našim predstojećim izložbama.";
  exhibitions[0].hidden = false;

  await s3.putObject({
    Bucket: bucket,
    Key: KEY,
    Body: JSON.stringify(exhibitions, null, 2),
    ContentType: 'application/json',
  }).promise();

  console.log('✅ Exhibition notes updated and hidden field added.');
}

main().catch(err => { console.error(err.message); process.exit(1); });
