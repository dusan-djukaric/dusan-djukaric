const express = require('express');
const { authenticate } = require('../middleware/auth');
const { s3, bucket, objectUrl } = require('../lib/objectStorage');
const upload = require('../lib/upload');
const router = express.Router();

// In-memory cache for listing responses — invalidated on any write operation
const listingCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

// Periodic sweep so stale entries don't accumulate when keys are never re-read
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of listingCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) listingCache.delete(key);
  }
}, CACHE_TTL_MS);

const getCachedListing = (key) => {
  const entry = listingCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    listingCache.delete(key);
    return null;
  }
  return entry.data;
};

const setCachedListing = (key, data) => {
  listingCache.set(key, { data, timestamp: Date.now() });
};

const invalidateListingCache = () => listingCache.clear();

const sanitizeInput = (input) => {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/[<>'"&]/g, '').trim().substring(0, 500);
};

// Sidecar .json key for extended metadata (descriptions, SEO data)
// S3 metadata headers have a ~2KB limit — long fields live here instead
const sidecarKey = (imageKey) => imageKey.replace(/\.[^.]+$/, '.json');

const EXTENDED_FIELDS = [
  'description', 'descriptionsrb',
  'seotitle', 'seotitlesrb',
  'metadescription', 'metadescriptionsrb',
  'alttext', 'alttextsrb',
  'keywords', 'keywordssrb',
  'slug'
];

async function readSidecar(key) {
  try {
    const obj = await s3.getObject({ Bucket: bucket, Key: sidecarKey(key) }).promise();
    return JSON.parse(obj.Body.toString('utf-8'));
  } catch (e) {
    return {};
  }
}

async function writeSidecar(key, extendedData) {
  await s3.putObject({
    Bucket: bucket,
    Key: sidecarKey(key),
    Body: JSON.stringify(extendedData),
    ContentType: 'application/json'
  }).promise();
}

async function deleteSidecar(key) {
  try {
    await s3.deleteObject({ Bucket: bucket, Key: sidecarKey(key) }).promise();
  } catch (e) {}
}

function buildMetadata(headResponse, extended) {
  return {
    title: headResponse.Metadata.title || '',
    titlesrb: headResponse.Metadata.titlesrb || '',
    x_dim: headResponse.Metadata.x_dim || '',
    y_dim: headResponse.Metadata.y_dim || '',
    sold: headResponse.Metadata.sold || 'false',
    reserved: headResponse.Metadata.reserved || 'false',
    deleted: headResponse.Metadata.deleted || 'false',
    uploadedat: headResponse.Metadata.uploadedat || '',
    ...extended
  };
}

// Fetch a single painting by timestamp ID (checks available + sold)
router.get('/painting/:id', async (req, res) => {
  const { id } = req.params;
  if (!/^\d+(\.\d+)?$/.test(id)) return res.status(400).json({ error: 'Invalid ID' });

  for (const folder of ['available', 'sold']) {
    const result = await s3.listObjectsV2({
      Bucket: bucket,
      Prefix: `${folder}/${id}`,
      MaxKeys: 2
    }).promise();

    const imageObj = result.Contents?.find(obj => !obj.Key.endsWith('.json'));
    if (imageObj) {
      const [headResponse, extended] = await Promise.all([
        s3.headObject({ Bucket: bucket, Key: imageObj.Key }).promise(),
        readSidecar(imageObj.Key)
      ]);
      const metadata = buildMetadata(headResponse, extended);
      if (metadata.deleted === 'true') return res.status(404).json({ error: 'Painting not found' });
      return res.json({ url: objectUrl(imageObj.Key), metadata });
    }
  }
  return res.status(404).json({ error: 'Painting not found' });
});

// Get all images with pagination
router.get('/images/:folder', async (req, res) => {
  try {
    const { folder } = req.params;
    const { continuationToken, maxKeys = 25 } = req.query;

    if (!['available', 'sold'].includes(folder)) {
      return res.status(400).json({ error: 'Invalid folder' });
    }

    const cacheKey = `${folder}:${continuationToken || ''}:${maxKeys}`;
    const cached = getCachedListing(cacheKey);
    if (cached) return res.json(cached);

    const response = await s3.listObjectsV2({
      Bucket: bucket,
      Prefix: `${folder}/`,
      MaxKeys: parseInt(maxKeys),
      ContinuationToken: continuationToken
    }).promise();

    // Exclude sidecar .json files from the image list
    const imageObjects = response.Contents.filter(obj => !obj.Key.endsWith('.json'));

    const imagePromises = imageObjects.map(async (object) => {
      try {
        const [headResponse, extended] = await Promise.all([
          s3.headObject({ Bucket: bucket, Key: object.Key }).promise(),
          readSidecar(object.Key)
        ]);
        return { url: objectUrl(object.Key), metadata: buildMetadata(headResponse, extended) };
      } catch (error) {
        console.error(`Error fetching metadata for ${object.Key}:`, error);
        return null;
      }
    });

    const images = (await Promise.all(imagePromises)).filter(img => img && img.metadata?.deleted !== 'true');

    const result = {
      images,
      continuationToken: response.NextContinuationToken,
      hasMore: !!response.NextContinuationToken
    };

    setCachedListing(cacheKey, result);
    res.json(result);

  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// Upload image
router.post('/upload', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { title, naslovSlike, dimX, dimY } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (!title || !naslovSlike || !dimX || !dimY) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const sanitizedTitle = sanitizeInput(title);
    const sanitizedNaslov = sanitizeInput(naslovSlike);
    const sanitizedDimX = sanitizeInput(dimX);
    const sanitizedDimY = sanitizeInput(dimY);

    if (!/^\d+$/.test(sanitizedDimX) || !/^\d+$/.test(sanitizedDimY)) {
      return res.status(400).json({ error: 'Dimensions must be numeric' });
    }

    const MAX_TIMESTAMP = 9999999999999;
    const reverse_timestamp = MAX_TIMESTAMP - Date.now();
    const random_suffix = Math.floor(1000 + Math.random() * 9000);
    const extension = file.originalname.split('.').pop().toLowerCase();
    const key = `available/${reverse_timestamp}${random_suffix}.${extension}`;

    // Upload image with only short metadata fields
    await s3.putObject({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        title: sanitizedTitle,
        titlesrb: encodeURIComponent(sanitizedNaslov),
        x_dim: sanitizedDimX,
        y_dim: sanitizedDimY,
        sold: 'false',
        reserved: 'false',
        deleted: 'false',
        uploadedat: new Date().toISOString()
      }
    }).promise();

    // Store extended fields in sidecar JSON file
    await writeSidecar(key, Object.fromEntries(EXTENDED_FIELDS.map(f => [f, req.body[f] || ''])));

    invalidateListingCache();
    res.json({ success: true, url: objectUrl(key), key });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Update image metadata
async function handleMetadataUpdate(req, res) {
  try {
    const { key, metadata } = req.body;

    if (!key || !metadata) {
      return res.status(400).json({ error: 'Missing key or metadata' });
    }

    const { Body, ContentType } = await s3.getObject({ Bucket: bucket, Key: key }).promise();

    // Short fields in S3 metadata headers (within 2KB limit)
    await s3.putObject({
      Bucket: bucket,
      Key: key,
      Body,
      ContentType,
      Metadata: {
        title: sanitizeInput(metadata.title || ''),
        titlesrb: sanitizeInput(metadata.titlesrb || ''),
        x_dim: sanitizeInput(metadata.x_dim || ''),
        y_dim: sanitizeInput(metadata.y_dim || ''),
        sold: metadata.sold || 'false',
        reserved: metadata.reserved || 'false',
        deleted: metadata.deleted || 'false',
        uploadedat: metadata.uploadedat || ''
      }
    }).promise();

    // Extended fields in sidecar JSON file
    await writeSidecar(key, Object.fromEntries(EXTENDED_FIELDS.map(f => [f, metadata[f] || ''])));

    invalidateListingCache();
    res.json({ success: true });

  } catch (error) {
    console.error('Metadata update error:', error);
    res.status(500).json({ error: 'Failed to update metadata' });
  }
}

router.put('/metadata', authenticate, handleMetadataUpdate);
router.post('/updateMetadata', authenticate, handleMetadataUpdate);

// Move image between folders
router.post('/move', authenticate, async (req, res) => {
  try {
    const { key, toFolder } = req.body;

    if (!key || !toFolder) {
      return res.status(400).json({ error: 'Missing key or destination folder' });
    }

    if (!['available', 'sold'].includes(toFolder)) {
      return res.status(400).json({ error: 'Invalid destination folder' });
    }

    const keyWithoutFolder = key.split('/').slice(1).join('/');
    const newKey = `${toFolder}/${keyWithoutFolder}`;

    const [{ Body, ContentType, Metadata }, extended] = await Promise.all([
      s3.getObject({ Bucket: bucket, Key: key }).promise(),
      readSidecar(key)
    ]);

    const hasSidecar = Object.keys(extended).length > 0;
    await Promise.all([
      s3.putObject({ Bucket: bucket, Key: newKey, Body, ContentType, Metadata }).promise(),
      hasSidecar ? writeSidecar(newKey, extended) : Promise.resolve()
    ]);
    await Promise.all([
      s3.deleteObject({ Bucket: bucket, Key: key }).promise(),
      hasSidecar ? deleteSidecar(key) : Promise.resolve()
    ]);

    invalidateListingCache();
    res.json({ success: true, newKey });

  } catch (error) {
    console.error('Move error:', error);
    res.status(500).json({ error: 'Failed to move image' });
  }
});

// Delete image
async function handleDelete(req, res) {
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({ error: 'Missing key' });
    }

    await Promise.all([
      s3.deleteObject({ Bucket: bucket, Key: key }).promise(),
      deleteSidecar(key)
    ]);

    invalidateListingCache();
    res.json({ success: true });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
}

router.delete('/delete', authenticate, handleDelete);
router.post('/deleteImage', authenticate, handleDelete);

module.exports = router;
