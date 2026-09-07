// Helper to extract the S3 key (available/xxx.jpg or sold/xxx.jpg) from a full URL.
// Handles both AWS (bucket in hostname) and Oracle (bucket in path) URL formats.
const extractS3Key = (url) => {
  const afterDotCom = url.split('.com/')[1]; // e.g. "available/xxx.jpg" or "ddjpictures/available/xxx.jpg"
  const parts = afterDotCom.split('/');
  // If the first segment is a known folder the key is already correct; otherwise strip the bucket prefix
  return (parts[0] === 'available' || parts[0] === 'sold') ? afterDotCom : parts.slice(1).join('/');
};

export const handleUpdateMataData = async (imageUrl, metadata) => {
  try {
    const s3Key = extractS3Key(imageUrl);
    
    // Import apiClient dynamically to avoid circular imports
    const { default: apiClient } = await import('../services/apiClient');
    
    // Call the API to update metadata
    const result = await apiClient.updateMetadata(s3Key, metadata);
    
    return result;
  } catch (error) {
    console.error('Failed to update metadata:', error);
    throw error;
  }
};

export const fetchSingleImage = async () => {
  try {
    // Import apiClient dynamically to avoid circular imports
    const { default: apiClient } = await import('../services/apiClient');
    
    // Fetch images from the available folder
    const result = await apiClient.fetchImages('available');
    
    // The API returns an object with an 'images' property, not a direct array
    const images = result?.images || result;
    
    if (images && images.length > 0) {
      // Filter out folder entries (URLs ending with '/') and only look at actual image files
      const imageFiles = images.filter(img => {
        const filename = img.url.split('/').pop();
        return filename && filename.includes('.'); // Has file extension
      });
      
      if (imageFiles.length > 0) {
        // Find the most recent image by looking for the highest timestamp in filename
        // Images are uploaded with timestamp-based filenames like "1234567890.jpeg"
        const mostRecentImage = imageFiles.reduce((latest, current) => {
          const currentTimestamp = parseInt(current.url.split('/').pop().split('.')[0]);
          const latestTimestamp = parseInt(latest.url.split('/').pop().split('.')[0]);
          return currentTimestamp > latestTimestamp ? current : latest;
        });
        
        return mostRecentImage;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching images:', error);
    return null;
  }
};

export const deleteImage = async (imageInfo) => {
  try {
    const s3Key = extractS3Key(imageInfo.url);

    // Import apiClient dynamically to avoid circular imports
    const { default: apiClient } = await import('../services/apiClient');
    
    // Call the API to delete the image
    const result = await apiClient.deleteImage(s3Key);

    return result;
  } catch (error) {
    throw error;
  }
};

export const reserveImage = async (imageUrl, metadata) => {
  try {
    const s3Key = extractS3Key(imageUrl);
    // Toggle the reserved status
    const newReservedStatus = metadata.reserved === 'true' ? 'false' : 'true';
    const updatedMetadata = {
      ...metadata,
      reserved: newReservedStatus
    };

    // Import apiClient dynamically to avoid circular imports
    const { default: apiClient } = await import('../services/apiClient');
    
    // Call the API to update metadata
    const result = await apiClient.updateMetadata(s3Key, updatedMetadata);
    
    return result;
  } catch (error) {
    console.error('❌ [FRONTEND] Failed to toggle reservation:', error);
    throw error;
  }
};

