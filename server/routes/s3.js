const express = require('express');
const AWS = require('aws-sdk');
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Oracle Cloud client (S3-compatible)
const oracleS3 = new AWS.S3({
  endpoint: process.env.ORACLE_ENDPOINT,
  s3ForcePathStyle: true,
  accessKeyId: process.env.ORACLE_ACCESS_KEY_ID,
  secretAccessKey: process.env.ORACLE_SECRET_ACCESS_KEY,
  region: 'eu-frankfurt-1',
});
const oracleBucket = process.env.ORACLE_BUCKET_NAME;
const allowedFileTypes = (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,webp').split(',');

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const extension = file.originalname.split('.').pop().toLowerCase();
    if (allowedFileTypes.includes(extension)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${allowedFileTypes.join(', ')}`));
    }
  }
});

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
    const obj = await oracleS3.getObject({ Bucket: oracleBucket, Key: sidecarKey(key) }).promise();
    return JSON.parse(obj.Body.toString('utf-8'));
  } catch (e) {
    return {};
  }
}

async function writeSidecar(key, extendedData) {
  await oracleS3.putObject({
    Bucket: oracleBucket,
    Key: sidecarKey(key),
    Body: JSON.stringify(extendedData),
    ContentType: 'application/json'
  }).promise();
}

async function deleteSidecar(key) {
  try {
    await oracleS3.deleteObject({ Bucket: oracleBucket, Key: sidecarKey(key) }).promise();
  } catch (e) {}
}

// Fetch a single painting by timestamp ID (checks available + sold)
router.get('/painting/:id', async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Invalid ID' });

  for (const folder of ['available', 'sold']) {
    const result = await oracleS3.listObjectsV2({
      Bucket: oracleBucket,
      Prefix: `${folder}/${id}`,
      MaxKeys: 2
    }).promise();

    const imageObj = result.Contents?.find(obj => !obj.Key.endsWith('.json'));
    if (imageObj) {
      const [headResponse, extended] = await Promise.all([
        oracleS3.headObject({ Bucket: oracleBucket, Key: imageObj.Key }).promise(),
        readSidecar(imageObj.Key)
      ]);
      const metadata = {
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
      if (metadata.deleted === 'true') return res.status(404).json({ error: 'Painting not found' });
      return res.json({
        url: `${process.env.ORACLE_ENDPOINT}/${oracleBucket}/${imageObj.Key}`,
        metadata
      });
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

    const response = await oracleS3.listObjectsV2({
      Bucket: oracleBucket,
      Prefix: `${folder}/`,
      MaxKeys: parseInt(maxKeys),
      ContinuationToken: continuationToken
    }).promise();

    // Exclude sidecar .json files from the image list
    const imageObjects = response.Contents.filter(obj => !obj.Key.endsWith('.json'));

    const imagePromises = imageObjects.map(async (object) => {
      try {
        const [headResponse, extended] = await Promise.all([
          oracleS3.headObject({ Bucket: oracleBucket, Key: object.Key }).promise(),
          readSidecar(object.Key)
        ]);

        const metadata = {
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

        return {
          url: `${process.env.ORACLE_ENDPOINT}/${oracleBucket}/${object.Key}`,
          metadata
        };
      } catch (error) {
        console.error(`Error fetching metadata for ${object.Key}:`, error);
        return null;
      }
    });

    const images = (await Promise.all(imagePromises)).filter(img => img && img.metadata?.deleted !== 'true');

    res.json({
      images,
      continuationToken: response.NextContinuationToken,
      hasMore: !!response.NextContinuationToken
    });

  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// Upload image
router.post('/upload', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { title, naslovSlike, dimX, dimY, description, descriptionsrb, seotitle, metadescription, alttext, keywords, seotitlesrb, metadescriptionsrb, alttextsrb, keywordssrb, slug } = req.body;
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
    const extension = file.originalname.split('.').pop().toLowerCase();
    const key = `available/${reverse_timestamp}.${extension}`;

    // Upload image with only short metadata fields
    await oracleS3.putObject({
      Bucket: oracleBucket,
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
    await writeSidecar(key, {
      description: description || '',
      descriptionsrb: descriptionsrb || '',
      seotitle: seotitle || '',
      seotitlesrb: seotitlesrb || '',
      metadescription: metadescription || '',
      metadescriptionsrb: metadescriptionsrb || '',
      alttext: alttext || '',
      alttextsrb: alttextsrb || '',
      keywords: keywords || '',
      keywordssrb: keywordssrb || '',
      slug: slug || ''
    });

    res.json({
      success: true,
      url: `${process.env.ORACLE_ENDPOINT}/${oracleBucket}/${key}`,
      key
    });

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

    const { Body, ContentType } = await oracleS3.getObject({ Bucket: oracleBucket, Key: key }).promise();

    // Short fields in S3 metadata headers (within 2KB limit)
    await oracleS3.putObject({
      Bucket: oracleBucket,
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
    const extended = {};
    for (const field of EXTENDED_FIELDS) {
      extended[field] = metadata[field] || '';
    }
    await writeSidecar(key, extended);

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

    const { Body, ContentType, Metadata } = await oracleS3.getObject({ Bucket: oracleBucket, Key: key }).promise();
    await oracleS3.putObject({ Bucket: oracleBucket, Key: newKey, Body, ContentType, Metadata }).promise();
    await oracleS3.deleteObject({ Bucket: oracleBucket, Key: key }).promise();

    // Move sidecar if it exists
    const extended = await readSidecar(key);
    if (Object.keys(extended).length > 0) {
      await writeSidecar(newKey, extended);
      await deleteSidecar(key);
    }

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
      oracleS3.deleteObject({ Bucket: oracleBucket, Key: key }).promise(),
      deleteSidecar(key)
    ]);

    res.json({ success: true });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
}

router.delete('/delete', authenticate, handleDelete);
router.post('/deleteImage', authenticate, handleDelete);

module.exports = router;
