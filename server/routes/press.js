const express = require('express');
const AWS = require('aws-sdk');
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

const oracleS3 = new AWS.S3({
  endpoint: process.env.ORACLE_ENDPOINT,
  s3ForcePathStyle: true,
  accessKeyId: process.env.ORACLE_ACCESS_KEY_ID,
  secretAccessKey: process.env.ORACLE_SECRET_ACCESS_KEY,
  region: 'eu-frankfurt-1',
});
const oracleBucket = process.env.ORACLE_BUCKET_NAME;
const DATA_KEY = 'press/data.json';

const allowedFileTypes = (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,webp').split(',');
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    allowedFileTypes.includes(ext) ? cb(null, true) : cb(new Error(`Invalid file type`));
  }
});

async function readData() {
  try {
    const result = await oracleS3.getObject({ Bucket: oracleBucket, Key: DATA_KEY }).promise();
    return JSON.parse(result.Body.toString('utf-8'));
  } catch (err) {
    if (err.code === 'NoSuchKey') return { articles: [], moreArticles: { images: [], imageKeys: [] }, videoIds: [] };
    throw err;
  }
}

async function writeData(data) {
  await oracleS3.putObject({
    Bucket: oracleBucket,
    Key: DATA_KEY,
    Body: JSON.stringify(data),
    ContentType: 'application/json',
  }).promise();
}

// GET /api/press — public, filters hidden articles
router.get('/', async (req, res) => {
  try {
    const data = await readData();
    res.json({
      articles: data.articles.filter(a => !a.hidden),
      moreArticles: data.moreArticles,
      videoIds: data.videoIds,
    });
  } catch (err) {
    console.error('Error reading press data:', err);
    res.status(500).json({ error: 'Failed to fetch press data' });
  }
});

// GET /api/press/all — authenticated, returns all including hidden
router.get('/all', authenticate, async (req, res) => {
  try {
    const data = await readData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch press data' });
  }
});

// PUT /api/press/videos — authenticated, replace the full video ID list
router.put('/videos', authenticate, async (req, res) => {
  try {
    const { videoIds } = req.body;
    if (!Array.isArray(videoIds)) return res.status(400).json({ error: 'videoIds must be an array' });
    const data = await readData();
    data.videoIds = videoIds;
    await writeData(data);
    res.json({ success: true, videoIds: data.videoIds });
  } catch (err) {
    console.error('Error updating video IDs:', err);
    res.status(500).json({ error: 'Failed to update video IDs' });
  }
});

// POST /api/press — authenticated, create article with multiple images
router.post('/', authenticate, upload.array('images', 20), async (req, res) => {
  try {
    const { titleEn, titleSr, textEn, textSr } = req.body;
    if (!titleEn) return res.status(400).json({ error: 'titleEn is required' });

    const images = [];
    const imageKeys = [];

    for (const file of req.files || []) {
      const ext = file.originalname.split('.').pop().toLowerCase();
      const key = `press/images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      await oracleS3.putObject({
        Bucket: oracleBucket, Key: key, Body: file.buffer, ContentType: file.mimetype,
      }).promise();
      imageKeys.push(key);
      images.push(`${process.env.ORACLE_ENDPOINT}/${oracleBucket}/${key}`);
    }

    const article = {
      id: Date.now().toString(),
      titleEn: titleEn || '',
      titleSr: titleSr || '',
      textEn: textEn || '',
      textSr: textSr || '',
      images,
      imageKeys,
      hidden: false,
      createdAt: new Date().toISOString(),
    };

    const data = await readData();
    data.articles.unshift(article);
    await writeData(data);
    res.json({ success: true, article });
  } catch (err) {
    console.error('Error creating press article:', err);
    res.status(500).json({ error: 'Failed to create article' });
  }
});

// PUT /api/press/:id — authenticated, update article text; optionally add more images
router.put('/:id', authenticate, upload.array('images', 20), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await readData();
    const index = data.articles.findIndex(a => a.id === id);
    if (index === -1) return res.status(404).json({ error: 'Article not found' });

    const article = data.articles[index];

    // Upload any new images and append them
    for (const file of req.files || []) {
      const ext = file.originalname.split('.').pop().toLowerCase();
      const key = `press/images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      await oracleS3.putObject({
        Bucket: oracleBucket, Key: key, Body: file.buffer, ContentType: file.mimetype,
      }).promise();
      article.imageKeys.push(key);
      article.images.push(`${process.env.ORACLE_ENDPOINT}/${oracleBucket}/${key}`);
    }

    data.articles[index] = {
      ...article,
      titleEn: req.body.titleEn ?? article.titleEn,
      titleSr: req.body.titleSr ?? article.titleSr,
      textEn: req.body.textEn ?? article.textEn,
      textSr: req.body.textSr ?? article.textSr,
      updatedAt: new Date().toISOString(),
    };

    await writeData(data);
    res.json({ success: true, article: data.articles[index] });
  } catch (err) {
    console.error('Error updating press article:', err);
    res.status(500).json({ error: 'Failed to update article' });
  }
});

// DELETE /api/press/:id/images/:imageIndex — remove one image from an article
router.delete('/:id/images/:imageIndex', authenticate, async (req, res) => {
  try {
    const { id, imageIndex } = req.params;
    const idx = parseInt(imageIndex);
    const data = await readData();
    const article = data.articles.find(a => a.id === id);
    if (!article) return res.status(404).json({ error: 'Article not found' });
    if (idx < 0 || idx >= article.images.length) return res.status(400).json({ error: 'Invalid image index' });

    const key = article.imageKeys[idx];
    article.images.splice(idx, 1);
    article.imageKeys.splice(idx, 1);
    await writeData(data);
    if (key) await oracleS3.deleteObject({ Bucket: oracleBucket, Key: key }).promise().catch(() => {});
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting image:', err);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// PATCH /api/press/:id/visibility — toggle hidden
router.patch('/:id/visibility', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const data = await readData();
    const article = data.articles.find(a => a.id === id);
    if (!article) return res.status(404).json({ error: 'Article not found' });
    article.hidden = !article.hidden;
    await writeData(data);
    res.json({ success: true, hidden: article.hidden });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle visibility' });
  }
});

// DELETE /api/press/:id — delete article and all its images
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const data = await readData();
    const index = data.articles.findIndex(a => a.id === id);
    if (index === -1) return res.status(404).json({ error: 'Article not found' });

    const imageKeys = data.articles[index].imageKeys || [];
    data.articles.splice(index, 1);
    await writeData(data);
    for (const key of imageKeys) {
      await oracleS3.deleteObject({ Bucket: oracleBucket, Key: key }).promise().catch(() => {});
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting article:', err);
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

module.exports = router;
