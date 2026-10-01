const multer = require('multer');

const allowedFileTypes = (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,webp').split(',');

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (allowedFileTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${allowedFileTypes.join(', ')}`));
    }
  }
});

module.exports = upload;
