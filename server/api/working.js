// Working API with all features, step by step
const express = require('express');
const cors = require('cors');
const AWS = require('aws-sdk');
const multer = require('multer');
const sharp = require('sharp');
const { authenticate, login, logout } = require('../middleware/auth');
const exhibitionsRouter = require('../routes/exhibitions');
const pressRouter = require('../routes/press');

const app = express();

// Oracle Cloud Object Storage client (S3-compatible)
const oracleS3 = new AWS.S3({
  endpoint: process.env.ORACLE_ENDPOINT,
  s3ForcePathStyle: true,
  accessKeyId: process.env.ORACLE_ACCESS_KEY_ID,
  secretAccessKey: process.env.ORACLE_SECRET_ACCESS_KEY,
  region: 'eu-frankfurt-1',
});
const oracleBucket = process.env.ORACLE_BUCKET_NAME;

const upload = multer({ storage: multer.memoryStorage() });

// Sidecar .json key for extended metadata (descriptions, SEO data)
// S3 metadata headers have a ~2KB limit — long fields live here instead
const sidecarKey = (imageKey) => imageKey.replace(/\.[^.]+$/, '.json');

// Fields stored in S3 object metadata (short, within 2KB limit)
const SHORT_META_FIELDS = ['title', 'titlesrb', 'x_dim', 'y_dim', 'sold', 'reserved', 'deleted', 'uploadedat'];

// Fields stored in the sidecar JSON file (no size limit)
const EXTENDED_FIELDS = [
  'description', 'descriptionsrb',
  'seotitle', 'seotitlesrb',
  'metadescription', 'metadescriptionsrb',
  'alttext', 'alttextsrb',
  'keywords', 'keywordssrb',
  'slug'
];

// Read sidecar file — returns {} if it doesn't exist
async function readSidecar(key) {
  try {
    const obj = await oracleS3.getObject({ Bucket: oracleBucket, Key: sidecarKey(key) }).promise();
    return JSON.parse(obj.Body.toString('utf-8'));
  } catch (e) {
    return {};
  }
}

// Write sidecar file
async function writeSidecar(key, extendedData) {
  await oracleS3.putObject({
    Bucket: oracleBucket,
    Key: sidecarKey(key),
    Body: JSON.stringify(extendedData),
    ContentType: 'application/json'
  }).promise();
}

// Delete sidecar file — ignores errors (file may not exist)
async function deleteSidecar(key) {
  try {
    await oracleS3.deleteObject({ Bucket: oracleBucket, Key: sidecarKey(key) }).promise();
  } catch (e) {}
}

// Basic middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://dusandjukaric.com', 'https://www.dusandjukaric.com', 'https://dusan-djukaric-5dyt.vercel.app']
    : ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Route mounts
app.use('/exhibitions', exhibitionsRouter);
app.use('/press', pressRouter);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Dusan Djukaric Backend API',
    status: 'running',
    version: 'working',
    endpoints: ['/health', '/auth/login', '/auth/logout', '/s3/images/:folder'],
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Debug endpoint to test Oracle Cloud access
app.get('/debug/s3', async (req, res) => {
  try {
    const result = await oracleS3.listObjectsV2({ Bucket: oracleBucket, MaxKeys: 1 }).promise();
    res.json({
      success: true,
      storage: 'Oracle Cloud',
      bucket: oracleBucket,
      endpoint: process.env.ORACLE_ENDPOINT,
      objectsCount: result.Contents ? result.Contents.length : 0,
      firstObject: result.Contents ? result.Contents[0] : null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      storage: 'Oracle Cloud',
      error: error.message,
      bucket: oracleBucket,
      endpoint: process.env.ORACLE_ENDPOINT
    });
  }
});

// Auth routes
app.post('/auth/login', login);
app.post('/auth/logout', logout);

// Fetch a single painting by timestamp ID (checks available + sold)
app.get('/s3/painting/:id', async (req, res) => {
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

// Image routes — Oracle Cloud
app.get('/s3/images/:folder', async (req, res) => {
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
        // Fetch S3 metadata and sidecar in parallel
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
          // Extended fields from sidecar
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

    const images = (await Promise.all(imagePromises))
      .filter(img => img && img.metadata?.deleted !== 'true');

    res.json({
      images,
      continuationToken: response.NextContinuationToken,
      hasMore: !!response.NextContinuationToken
    });

  } catch (error) {
    console.error('Fetch images error:', error);
    res.status(500).json({ error: 'Error fetching images.' });
  }
});

// Update metadata
app.post('/s3/updateMetadata', async (req, res) => {
  try {
    const { key, metadata } = req.body;

    if (!key || !metadata) {
      return res.status(400).json({ error: 'Missing key or metadata' });
    }

    const { Body, ContentType } = await oracleS3.getObject({ Bucket: oracleBucket, Key: key }).promise();

    // Short fields go into S3 metadata headers (within 2KB limit)
    await oracleS3.putObject({
      Bucket: oracleBucket,
      Key: key,
      Body,
      ContentType,
      Metadata: {
        title: metadata.title || '',
        titlesrb: metadata.titlesrb || '',
        x_dim: metadata.x_dim || '',
        y_dim: metadata.y_dim || '',
        sold: metadata.sold || 'false',
        reserved: metadata.reserved || 'false',
        deleted: metadata.deleted || 'false',
        uploadedat: metadata.uploadedat || ''
      }
    }).promise();

    // Extended fields go into the sidecar JSON file (no size limit)
    const extended = {};
    for (const field of EXTENDED_FIELDS) {
      extended[field] = metadata[field] || '';
    }
    await writeSidecar(key, extended);

    res.json({ success: true });

  } catch (error) {
    console.error('Update metadata error:', error);
    res.status(500).json({ error: 'Failed to update metadata' });
  }
});

// Delete image
app.post('/s3/deleteImage', async (req, res) => {
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
    res.status(500).json({ error: 'Failed to delete image', details: error.message });
  }
});

// Upload image
app.post('/s3/upload', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { title, naslovSlike, dimX, dimY, description, descriptionsrb, seotitle, metadescription, alttext, keywords, seotitlesrb, metadescriptionsrb, alttextsrb, keywordssrb, slug } = req.body;
    const file = req.file;

    if (!file || !title) {
      return res.status(400).json({ error: 'Missing file or title' });
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
        title: title || '',
        titlesrb: naslovSlike || '',
        x_dim: dimX || '',
        y_dim: dimY || '',
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
      key,
      url: `${process.env.ORACLE_ENDPOINT}/${oracleBucket}/${key}`
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image', details: error.message });
  }
});

// Move image between folders
app.post('/s3/move', async (req, res) => {
  try {
    const { key, toFolder } = req.body;

    if (!key || !toFolder) {
      return res.status(400).json({ error: 'Missing key or destination folder' });
    }

    if (!['available', 'sold'].includes(toFolder)) {
      return res.status(400).json({ error: 'Invalid destination folder' });
    }

    const newKey = key.replace(/^(available|sold)\//, `${toFolder}/`);

    // Move image file
    const { Body, ContentType, Metadata } = await oracleS3.getObject({ Bucket: oracleBucket, Key: key }).promise();
    await oracleS3.putObject({ Bucket: oracleBucket, Key: newKey, Body, ContentType, Metadata }).promise();
    await oracleS3.deleteObject({ Bucket: oracleBucket, Key: key }).promise();

    // Move sidecar file if it exists
    const extended = await readSidecar(key);
    if (Object.keys(extended).length > 0) {
      await writeSidecar(newKey, extended);
      await deleteSidecar(key);
    }

    res.json({ success: true, newKey });

  } catch (error) {
    console.error('Move error:', error);
    res.status(500).json({ error: 'Failed to move image', details: error.message });
  }
});

// Slug helper — mirrors the frontend generateSlug
const generateSlug = (title) =>
  (title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// URL ID helper — slug-TIMESTAMP format
const getPaintingUrlId = (url, metadata) => {
  const timestampId = url.split('/').pop().split('.')[0];
  const baseSlug = (metadata.slug || generateSlug(metadata.title) || '').trim();
  if (!baseSlug) return timestampId;
  return `${baseSlug}-${timestampId}`;
};

// OG image — letterbox painting onto 1200×630 canvas so portrait paintings aren't cropped on Facebook
app.get('/og-image/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).send('Invalid ID');

    let imageKey = null;
    for (const folder of ['available', 'sold']) {
      const result = await oracleS3.listObjectsV2({
        Bucket: oracleBucket,
        Prefix: `${folder}/${id}`,
        MaxKeys: 2
      }).promise();
      const obj = result.Contents?.find(o => !o.Key.endsWith('.json'));
      if (obj) { imageKey = obj.Key; break; }
    }

    if (!imageKey) return res.status(404).send('Not found');

    const { Body } = await oracleS3.getObject({ Bucket: oracleBucket, Key: imageKey }).promise();

    const canvas = { r: 245, g: 243, b: 240, alpha: 255 };
    const output = await sharp(Body)
      .resize(1200, 630, { fit: 'contain', background: canvas })
      .jpeg({ quality: 85 })
      .toBuffer();

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(output);
  } catch (error) {
    console.error('OG image error:', error);
    res.status(500).send('Error generating OG image');
  }
});

// Sitemap — lists all non-deleted paintings with slug-TIMESTAMP URLs
app.get('/sitemap.xml', async (req, res) => {
  try {
    const BASE_URL = 'https://www.dusandjukaric.com';
    const allImages = [];

    for (const folder of ['available', 'sold']) {
      let continuationToken;
      do {
        const params = { Bucket: oracleBucket, Prefix: `${folder}/`, MaxKeys: 1000 };
        if (continuationToken) params.ContinuationToken = continuationToken;
        const response = await oracleS3.listObjectsV2(params).promise();
        const imageObjects = (response.Contents || []).filter(obj => !obj.Key.endsWith('.json'));

        const metas = await Promise.all(imageObjects.map(async (obj) => {
          try {
            const [head, extended] = await Promise.all([
              oracleS3.headObject({ Bucket: oracleBucket, Key: obj.Key }).promise(),
              readSidecar(obj.Key)
            ]);
            const metadata = { ...head.Metadata, ...extended };
            if (metadata.deleted === 'true') return null;
            return { url: `${process.env.ORACLE_ENDPOINT}/${oracleBucket}/${obj.Key}`, metadata, lastModified: obj.LastModified };
          } catch { return null; }
        }));

        metas.filter(Boolean).forEach(item => allImages.push(item));
        continuationToken = response.NextContinuationToken;
      } while (continuationToken);
    }

    const staticPages = [
      { loc: `${BASE_URL}/`, priority: '1.0' },
      { loc: `${BASE_URL}/gallery`, priority: '0.9' },
      { loc: `${BASE_URL}/sold`, priority: '0.7' },
      { loc: `${BASE_URL}/about`, priority: '0.6' },
      { loc: `${BASE_URL}/contact`, priority: '0.5' },
    ];

    const paintingEntries = allImages.map(img => {
      const urlId = getPaintingUrlId(img.url, img.metadata);
      const lastmod = img.lastModified ? img.lastModified.toISOString().split('T')[0] : '';
      return `  <url>\n    <loc>${BASE_URL}/gallery/${urlId}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n    <priority>0.8</priority>\n  </url>`;
    });

    const staticEntries = staticPages.map(p =>
      `  <url>\n    <loc>${p.loc}</loc>\n    <priority>${p.priority}</priority>\n  </url>`
    );

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${staticEntries.join('\n')}\n${paintingEntries.join('\n')}\n</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(xml);
  } catch (error) {
    console.error('Sitemap error:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

module.exports = app;
