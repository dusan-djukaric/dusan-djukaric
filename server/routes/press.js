const express = require('express');
const { authenticate } = require('../middleware/auth');
const { s3, bucket, objectUrl } = require('../lib/objectStorage');
const upload = require('../lib/upload');
const router = express.Router();

const DATA_KEY = 'press/data.json';

async function readData() {
  try {
    const result = await s3.getObject({ Bucket: bucket, Key: DATA_KEY }).promise();
    return JSON.parse(result.Body.toString('utf-8'));
  } catch (err) {
    if (err.code === 'NoSuchKey') return { articles: [], moreArticles: { images: [], imageKeys: [] }, videoIds: [] };
    throw err;
  }
}

async function writeData(data) {
  await s3.putObject({
    Bucket: bucket,
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

    const uploadResults = await Promise.all((req.files || []).map(file => {
      const ext = file.originalname.split('.').pop().toLowerCase();
      const key = `press/images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      return s3.putObject({
        Bucket: bucket, Key: key, Body: file.buffer, ContentType: file.mimetype,
      }).promise().then(() => key);
    }));
    const imageKeys = uploadResults;
    const images = uploadResults.map(key => objectUrl(key));

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
    const newKeys = await Promise.all((req.files || []).map(file => {
      const ext = file.originalname.split('.').pop().toLowerCase();
      const key = `press/images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      return s3.putObject({
        Bucket: bucket, Key: key, Body: file.buffer, ContentType: file.mimetype,
      }).promise().then(() => key);
    }));
    article.imageKeys.push(...newKeys);
    article.images.push(...newKeys.map(key => objectUrl(key)));

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
    if (key) await s3.deleteObject({ Bucket: bucket, Key: key }).promise().catch(() => {});
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
      await s3.deleteObject({ Bucket: bucket, Key: key }).promise().catch(() => {});
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting article:', err);
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

module.exports = router;
