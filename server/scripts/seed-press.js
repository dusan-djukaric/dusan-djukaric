/**
 * One-time seed script: uploads all press article images to Oracle Cloud
 * and writes press/data.json with the full press content.
 *
 * Usage:
 *   cd server && node scripts/seed-press.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

const s3 = new AWS.S3({
  endpoint: process.env.ORACLE_ENDPOINT,
  s3ForcePathStyle: true,
  accessKeyId: process.env.ORACLE_ACCESS_KEY_ID,
  secretAccessKey: process.env.ORACLE_SECRET_ACCESS_KEY,
  region: 'eu-frankfurt-1',
});
const bucket = process.env.ORACLE_BUCKET_NAME;
const DATA_KEY = 'press/data.json';
const ASSETS_DIR = path.join(__dirname, '../../src/components/assets/newsArticles');
const BASE_URL = `${process.env.ORACLE_ENDPOINT}/${bucket}`;

async function uploadImage(filename) {
  const key = `press/images/${filename}`;
  const filePath = path.join(ASSETS_DIR, filename);
  const body = fs.readFileSync(filePath);
  await s3.putObject({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: 'image/jpeg',
  }).promise();
  return `${BASE_URL}/${key}`;
}

async function main() {
  // Check if already seeded
  try {
    await s3.headObject({ Bucket: bucket, Key: DATA_KEY }).promise();
    console.log('press/data.json already exists — skipping seed.');
    console.log('Delete it from Oracle first if you want to re-seed.');
    return;
  } catch (err) {
    if (err.code !== 'NotFound' && err.code !== 'NoSuchKey') throw err;
  }

  // Upload all images
  const imageFiles = fs.readdirSync(ASSETS_DIR).filter(f => f.endsWith('.jpg'));
  console.log(`Uploading ${imageFiles.length} images...`);

  const urlMap = {};
  for (const file of imageFiles) {
    process.stdout.write(`  ${file}... `);
    urlMap[file] = await uploadImage(file);
    console.log('✓');
  }

  const u = (f) => urlMap[f];
  const k = (f) => `press/images/${f}`;

  const articles = [
    {
      id: '1',
      titleEn: 'CREATING PAINTINGS FROM ORDINARY LIFE',
      titleSr: 'STVARANJE SLIKA IZ OBIČNOG ŽIVOTA',
      textEn: 'A watercolour is a painting that reveals an artist who performs a play before the audience, and that play has to have everything - a good script, direction, stage, lighting and in the end you get an extra round of applause... If these are absent, you will play without a prize.',
      textSr: 'Akvarel je slika koja otkriva umetnika i on igra predstavu pred publikom  a ta predstava mora imati sve. Dobar scenarijo, režiju, scenu, svetlo i uvek na kraju toga dobićete aplauz više... Ako toga nema igraćete bez nagrade.',
      images: ['0_1.jpg','0_2.jpg','0_3.jpg','0_4.jpg','0_5.jpg'].map(u),
      imageKeys: ['0_1.jpg','0_2.jpg','0_3.jpg','0_4.jpg','0_5.jpg'].map(k),
      hidden: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      titleEn: 'SPARKED BY A MOOD',
      titleSr: 'POKRENUTO STANJEM DUHA',
      textEn: 'A good watercolor reveals everything from the first to the last move, everything is presented to the observer to judge. That is the privilege of an artist, to fully reveal himself to other and to remain unhurt. That is watercolor...',
      textSr: 'Dobar akvarel otkriva sve od prvog do poslednjeg poteza sve je dato na sud posmatraču, E tu je privilegija umetnika da sebe celog da drugima, otkrije a da pri tome ostane nepovređen. To je akvarel...',
      images: ['1_1.jpg','1_2.jpg','1_3.jpg','1_4.jpg','1_5.jpg'].map(u),
      imageKeys: ['1_1.jpg','1_2.jpg','1_3.jpg','1_4.jpg','1_5.jpg'].map(k),
      hidden: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: '3',
      titleEn: 'THE ATMOSPHERE OF THE CITY',
      titleSr: 'ATMOSFERA GRADA',
      textEn: 'Fascinated by the notion of instant, this Serbian watercolorist, who devotes a true passion to painting en plein air, reveals here landscapes bathed in a soft and diffused light. The eye can travel around and wander, this is where experience is important and precious and comes into rescue when it is necessary...',
      textSr: 'Očaran idejom trenutka, ovaj srpski akvarelista, koji posvećuje pravu strast slikanju en plein air, otkriva ovde pejzaže umivene mekim i difuznim svetlom. Oko može da putuje okolo i da šeta, tu je iskustvo važno i dragoceno a važno je i da stigne u pomoć kad treba...',
      images: ['3_1.jpg','3_2.jpg','3_3.jpg','3_4.jpg'].map(u),
      imageKeys: ['3_1.jpg','3_2.jpg','3_3.jpg','3_4.jpg'].map(k),
      hidden: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: '4',
      titleEn: 'PAINTER OF THE MOMENT',
      titleSr: 'TRENUTAK UMETNIKA',
      textEn: "Dusan Djukaric is fascinated by the notion of the moment: the one when he paints and the one he portrays in his atmospheric landscapes, preferably Mediterranean, bathed in a soft and diffused light.\n'Where should one stop, where is the limit? I am always experimenting.'",
      textSr: "Dušan Đukarić fasciniran je pojmom trenutka: onog kad slika i onog kojeg prikazuje u svojim atmosferskim pejzažima, po mogućstvu mediteranskim, okupanim mekim i difuznim svetlom.\n'Gde treba stati, gde je granica? Uvek eksperimentišem.'",
      images: ['5_1.jpg','5_2.jpg','5_3.jpg','5_4.jpg'].map(u),
      imageKeys: ['5_1.jpg','5_2.jpg','5_3.jpg','5_4.jpg'].map(k),
      hidden: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: '5',
      titleEn: 'WATERCOLOUR IS A CONSTANT CHALLENGE',
      titleSr: 'AKVAREL JE STALNI IZAZOV',
      textEn: "A interview for Politika's Magazine",
      textSr: 'Intervju za Politikin Magazin',
      images: ['8_1.jpg','8_2.jpg'].map(u),
      imageKeys: ['8_1.jpg','8_2.jpg'].map(k),
      hidden: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: '6',
      titleEn: 'TIME STRENGHTENS TRUE ART',
      titleSr: 'VREME OJAČAVA ISTINSKU UMETNOST',
      textEn: 'A interview for the daily news Danas',
      textSr: 'Intervju za Dnevni list Danas',
      images: ['9_1.jpg'].map(u),
      imageKeys: ['9_1.jpg'].map(k),
      hidden: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: '7',
      titleEn: 'PETAR PECA POPOVIC, ABOUT THE ART OF DUSAN DjUKARIC',
      titleSr: 'PETAR PECA POPOVIĆ, O UMETNOSTI DUŠANA ĐUKARIĆA',
      textEn: '',
      textSr: '',
      images: ['10_1.jpg','10_2.jpg','10_3.jpg','10_4.jpg'].map(u),
      imageKeys: ['10_1.jpg','10_2.jpg','10_3.jpg','10_4.jpg'].map(k),
      hidden: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: '8',
      titleEn: 'UNIFICATION AND TRANSCENDENCE',
      titleSr: 'SJEDINJAVANJE I NADRASTANJE',
      textEn: "He elevated this art to a higher level. We don't recognize his urban settings by their accuracy of description, but by the impression they leave. He is a painter of atmosphere, not a mere replicator of reality.",
      textSr: 'Podigao je ovu umetnost na viši nivo. Njegove gradske scene ne prepoznajemo po tačnosti opisa, već po utisku koji ostavljaju. On je slikar atmosfere, ne doslovni prepisivač realnosti.',
      images: ['7_1.jpg','7_2.jpg','7_3.jpg'].map(u),
      imageKeys: ['7_1.jpg','7_2.jpg','7_3.jpg'].map(k),
      hidden: false,
      createdAt: new Date().toISOString(),
    },
  ];

  const moreArticles = {
    images: ['6_2.jpg','2.jpg','4.jpg'].map(u),
    imageKeys: ['6_2.jpg','2.jpg','4.jpg'].map(k),
  };

  const videoIds = [
    'W5cnwbaF12I', '_MKdGovIjTk', 'CzXjP2WolbI', 'vQqSGX_L1BI',
    'JmKDjzLruJE', 'rivqlaKCzQ4', '92c2hU0W0Z0', 'ffiGpNYOJ6w',
    'euhOpXh1tZ0', 'HnpjIiXH9CQ', 'qVzgonnKYGg', '0-5YmEaWBXM',
  ];

  const data = { articles, moreArticles, videoIds };

  await s3.putObject({
    Bucket: bucket,
    Key: DATA_KEY,
    Body: JSON.stringify(data, null, 2),
    ContentType: 'application/json',
  }).promise();

  console.log('\n✅ press/data.json written with 8 articles and 12 YouTube videos.');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
