const express = require('express');
const AWS = require('aws-sdk');
const multer = require('multer');
const router = express.Router();

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
const bucketName = process.env.S3_BUCKET_NAME;
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10485760; // 10MB
const allowedFileTypes = (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,webp').split(',');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxFileSize
  },
  fileFilter: (req, file, cb) => {
    const extension = file.originalname.split('.').pop().toLowerCase();
    if (allowedFileTypes.includes(extension)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${allowedFileTypes.join(', ')}`));
    }
  }
});

// Utility functions
const validateFileType = (filename) => {
  const extension = filename.split('.').pop().toLowerCase();
  return allowedFileTypes.includes(extension);
};

const sanitizeInput = (input) => {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/[<>'"&]/g, '').trim().substring(0, 200);
};

// Get all images with pagination
router.get('/images/:folder', async (req, res) => {
  try {
    const { folder } = req.params;
    const { continuationToken, maxKeys = 25 } = req.query;
    
    if (!['available', 'sold'].includes(folder)) {
      return res.status(400).json({ error: 'Invalid folder' });
    }
    
    const params = {
      Bucket: bucketName,
      Prefix: `${folder}/`,
      MaxKeys: parseInt(maxKeys),
      ContinuationToken: continuationToken
    };
    
    const response = await s3.listObjectsV2(params).promise();
    
    // Get metadata for each image
    const imagePromises = response.Contents.map(async (object) => {
      try {
        const headResponse = await s3.headObject({
          Bucket: bucketName,
          Key: object.Key
        }).promise();
        
        return {
          url: `https://${bucketName}.s3.amazonaws.com/${object.Key}`,
          metadata: headResponse.Metadata,
          key: object.Key
        };
      } catch (error) {
        console.error(`Error fetching metadata for ${object.Key}:`, error);
        return null;
      }
    });
    
    const images = (await Promise.all(imagePromises)).filter(Boolean);
    
    res.json({
      images: images.map(img => ({
        Key: img.key,
        LastModified: new Date(),
        Size: 0,
        url: img.url,
        metadata: img.metadata
      })),
      continuationToken: response.NextContinuationToken,
      hasMore: !!response.NextContinuationToken
    });
    
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// Upload image
router.post('/upload', async (req, res) => {
  try {
    const { title, naslovSlike, dimX, dimY } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    // Validate inputs
    if (!title || !naslovSlike || !dimX || !dimY) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Sanitize inputs
    const sanitizedTitle = sanitizeInput(title);
    const sanitizedNaslov = sanitizeInput(naslovSlike);
    const sanitizedDimX = sanitizeInput(dimX);
    const sanitizedDimY = sanitizeInput(dimY);
    
    // Validate dimensions
    if (!/^\d+$/.test(sanitizedDimX) || !/^\d+$/.test(sanitizedDimY)) {
      return res.status(400).json({ error: 'Dimensions must be numeric' });
    }
    
    // Generate unique filename with reverse timestamp for proper ordering
    const MAX_TIMESTAMP = 9999999999999;
    const reverse_timestamp = MAX_TIMESTAMP - Date.now();
    const extension = file.originalname.split('.').pop().toLowerCase();
    const filename = `${reverse_timestamp}.${extension}`;
    const key = `available/${filename}`;
    
    // Upload to S3
    const uploadParams = {
      Bucket: bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        title: sanitizedTitle,
        titlesrb: encodeURIComponent(sanitizedNaslov),
        x_dim: sanitizedDimX,
        y_dim: sanitizedDimY,
        sold: 'false',
        uploadedAt: new Date().toISOString(),
        uploadedBy: req.user.username
      }
    };
    
    const result = await s3.upload(uploadParams).promise();
    
    res.json({
      success: true,
      url: result.Location,
      key: key
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Update image metadata
router.put('/metadata', async (req, res) => {
  try {
    const { key, metadata } = req.body;
    
    if (!key || !metadata) {
      return res.status(400).json({ error: 'Missing key or metadata' });
    }
    
    // Sanitize metadata
    const sanitizedMetadata = {};
    for (const [k, v] of Object.entries(metadata)) {
      sanitizedMetadata[k] = sanitizeInput(v);
    }
    
    // Copy object with new metadata
    const copyParams = {
      Bucket: bucketName,
      CopySource: `${bucketName}/${key}`,
      Key: key,
      Metadata: sanitizedMetadata,
      MetadataDirective: 'REPLACE'
    };
    
    await s3.copyObject(copyParams).promise();
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Metadata update error:', error);
    res.status(500).json({ error: 'Failed to update metadata' });
  }
});

// Move image between folders
router.post('/move', async (req, res) => {
  try {
    const { key, toFolder } = req.body;
    
    if (!key || !toFolder) {
      return res.status(400).json({ error: 'Missing key or destination folder' });
    }
    
    if (!['available', 'sold'].includes(toFolder)) {
      return res.status(400).json({ error: 'Invalid destination folder' });
    }
    
    const newKey = key.replace(/^(available|sold)\//, `${toFolder}/`);
    
    // Copy to new location
    const copyParams = {
      Bucket: bucketName,
      CopySource: `${bucketName}/${key}`,
      Key: newKey,
      MetadataDirective: 'COPY'
    };
    
    await s3.copyObject(copyParams).promise();
    
    // Delete original
    await s3.deleteObject({
      Bucket: bucketName,
      Key: key
    }).promise();
    
    res.json({ 
      success: true, 
      newKey: newKey 
    });
    
  } catch (error) {
    console.error('Move error:', error);
    res.status(500).json({ error: 'Failed to move image' });
  }
});

// Delete image
router.delete('/delete', async (req, res) => {
  try {
    const { key } = req.body;
    
    if (!key) {
      return res.status(400).json({ error: 'Missing key' });
    }
    
    // Mark as deleted in metadata instead of actually deleting
    const headResponse = await s3.headObject({
      Bucket: bucketName,
      Key: key
    }).promise();
    
    const newMetadata = {
      ...headResponse.Metadata,
      deleted: 'true',
      deletedAt: new Date().toISOString(),
      deletedBy: req.user.username
    };
    
    const copyParams = {
      Bucket: bucketName,
      CopySource: `${bucketName}/${key}`,
      Key: key,
      Metadata: newMetadata,
      MetadataDirective: 'REPLACE'
    };
    
    await s3.copyObject(copyParams).promise();
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

module.exports = router;
