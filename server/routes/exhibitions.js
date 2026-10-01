const express = require('express');
const { authenticate } = require('../middleware/auth');
const { s3, bucket, objectUrl } = require('../lib/objectStorage');
const upload = require('../lib/upload');
const router = express.Router();

const DATA_KEY = 'exhibitions/data.json';

async function readExhibitions() {
  try {
    const result = await s3.getObject({ Bucket: bucket, Key: DATA_KEY }).promise();
    return JSON.parse(result.Body.toString('utf-8'));
  } catch (err) {
    if (err.code === 'NoSuchKey') return [];
    throw err;
  }
}

async function writeExhibitions(exhibitions) {
  await s3.putObject({
    Bucket: bucket,
    Key: DATA_KEY,
    Body: JSON.stringify(exhibitions),
    ContentType: 'application/json',
  }).promise();
}

// GET /api/exhibitions — public (excludes hidden)
router.get('/', async (req, res) => {
  try {
    const exhibitions = await readExhibitions();
    res.json({ exhibitions: exhibitions.filter(e => !e.hidden) });
  } catch (err) {
    console.error('Error reading exhibitions:', err);
    res.status(500).json({ error: 'Failed to fetch exhibitions' });
  }
});

// GET /api/exhibitions/all — authenticated, returns all including hidden
router.get('/all', authenticate, async (req, res) => {
  try {
    const exhibitions = await readExhibitions();
    res.json({ exhibitions });
  } catch (err) {
    console.error('Error reading exhibitions:', err);
    res.status(500).json({ error: 'Failed to fetch exhibitions' });
  }
});

// PATCH /api/exhibitions/:id/visibility — authenticated, toggles hidden flag
router.patch('/:id/visibility', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const exhibitions = await readExhibitions();
    const index = exhibitions.findIndex(e => e.id === id);
    if (index === -1) return res.status(404).json({ error: 'Exhibition not found' });

    exhibitions[index].hidden = !exhibitions[index].hidden;
    await writeExhibitions(exhibitions);
    res.json({ success: true, hidden: exhibitions[index].hidden });
  } catch (err) {
    console.error('Error toggling visibility:', err);
    res.status(500).json({ error: 'Failed to update visibility' });
  }
});

// POST /api/exhibitions — authenticated, creates a new exhibition
router.post('/', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { titleEn, titleSr, dateStart, dateEnd, openingTime, locationEn, locationSr, locationUrl, noteEn, noteSr } = req.body;

    if (!titleEn || !dateStart) {
      return res.status(400).json({ error: 'titleEn and dateStart are required' });
    }

    let imageUrl = null;
    let imageKey = null;

    if (req.file) {
      const ext = req.file.originalname.split('.').pop().toLowerCase();
      const key = `exhibitions/images/${Date.now()}.${ext}`;
      await s3.putObject({
        Bucket: bucket,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      }).promise();
      imageKey = key;
      imageUrl = objectUrl(key);
    }

    const exhibition = {
      id: Date.now().toString(),
      titleEn: titleEn || '',
      titleSr: titleSr || '',
      dateStart: dateStart || '',
      dateEnd: dateEnd || '',
      openingTime: openingTime || '',
      locationEn: locationEn || '',
      locationSr: locationSr || '',
      locationUrl: locationUrl || '',
      noteEn: noteEn || '',
      noteSr: noteSr || '',
      imageUrl,
      imageKey,
      createdAt: new Date().toISOString(),
    };

    const exhibitions = await readExhibitions();
    exhibitions.unshift(exhibition); // newest first
    await writeExhibitions(exhibitions);

    res.json({ success: true, exhibition });
  } catch (err) {
    console.error('Error creating exhibition:', err);
    res.status(500).json({ error: 'Failed to create exhibition' });
  }
});

// PUT /api/exhibitions/:id — authenticated, updates an exhibition
router.put('/:id', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const exhibitions = await readExhibitions();
    const index = exhibitions.findIndex(e => e.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Exhibition not found' });
    }

    let imageUrl = exhibitions[index].imageUrl;
    let imageKey = exhibitions[index].imageKey;

    if (req.file) {
      // Delete old image if it exists
      if (imageKey) {
        await s3.deleteObject({ Bucket: bucket, Key: imageKey }).promise().catch(() => {});
      }
      const ext = req.file.originalname.split('.').pop().toLowerCase();
      const key = `exhibitions/images/${Date.now()}.${ext}`;
      await s3.putObject({
        Bucket: bucket,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      }).promise();
      imageKey = key;
      imageUrl = objectUrl(key);
    }

    exhibitions[index] = {
      ...exhibitions[index],
      titleEn: req.body.titleEn ?? exhibitions[index].titleEn,
      titleSr: req.body.titleSr ?? exhibitions[index].titleSr,
      dateStart: req.body.dateStart ?? exhibitions[index].dateStart,
      dateEnd: req.body.dateEnd ?? exhibitions[index].dateEnd,
      openingTime: req.body.openingTime ?? exhibitions[index].openingTime,
      locationEn: req.body.locationEn ?? exhibitions[index].locationEn,
      locationSr: req.body.locationSr ?? exhibitions[index].locationSr,
      locationUrl: req.body.locationUrl ?? exhibitions[index].locationUrl,
      noteEn: req.body.noteEn ?? exhibitions[index].noteEn,
      noteSr: req.body.noteSr ?? exhibitions[index].noteSr,
      imageUrl,
      imageKey,
      updatedAt: new Date().toISOString(),
    };

    await writeExhibitions(exhibitions);
    res.json({ success: true, exhibition: exhibitions[index] });
  } catch (err) {
    console.error('Error updating exhibition:', err);
    res.status(500).json({ error: 'Failed to update exhibition' });
  }
});

// DELETE /api/exhibitions/:id — authenticated
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const exhibitions = await readExhibitions();
    const index = exhibitions.findIndex(e => e.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Exhibition not found' });
    }

    const imageKey = exhibitions[index].imageKey;
    exhibitions.splice(index, 1);
    await writeExhibitions(exhibitions);

    if (imageKey) {
      await s3.deleteObject({ Bucket: bucket, Key: imageKey }).promise().catch(() => {});
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting exhibition:', err);
    res.status(500).json({ error: 'Failed to delete exhibition' });
  }
});

module.exports = router;
