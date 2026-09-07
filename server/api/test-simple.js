// Simple test backend without authentication
const express = require('express');
const cors = require('cors');
const AWS = require('aws-sdk');

const app = express();

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

// CORS middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Test Backend API',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// S3 images route
app.get('/s3/images/:folder', async (req, res) => {
  try {
    const { folder } = req.params;
    const { continuationToken, maxKeys = 25 } = req.query;
    
    if (!['available', 'sold'].includes(folder)) {
      return res.status(400).json({ error: 'Invalid folder' });
    }
    
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Prefix: `${folder}/`,
      MaxKeys: parseInt(maxKeys),
      ContinuationToken: continuationToken
    };
    
    const response = await s3.listObjectsV2(params).promise();
    
    // Get metadata for each image
    const imagePromises = response.Contents.map(async (object) => {
      try {
        const headResponse = await s3.headObject({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: object.Key
        }).promise();
        
        const metadata = {
          title: headResponse.Metadata.title || '',
          titlesrb: headResponse.Metadata.titlesrb || '',
          x_dim: headResponse.Metadata.x_dim || '',
          y_dim: headResponse.Metadata.y_dim || '',
          sold: headResponse.Metadata.sold || 'false',
          reserved: headResponse.Metadata.reserved || 'false',
          deleted: headResponse.Metadata.deleted || 'false',
          ...headResponse.Metadata
        };
        
        return {
          url: `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${object.Key}`,
          metadata: metadata
        };
      } catch (error) {
        console.error(`Error fetching metadata for ${object.Key}:`, error);
        return null;
      }
    });
    
    const images = (await Promise.all(imagePromises)).filter(Boolean);
    
    res.json({
      images: images,
      continuationToken: response.NextContinuationToken,
      hasMore: !!response.NextContinuationToken
    });
    
  } catch (error) {
    console.error('S3 fetch error:', error);
    res.status(500).json({ error: 'Error fetching images.' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message
  });
});

module.exports = app;
