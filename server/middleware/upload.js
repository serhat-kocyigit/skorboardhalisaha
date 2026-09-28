/**
 * Multer Middleware - Dosya yükleme konfigürasyonu
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Upload dizinlerini oluştur
const uploadDirs = ['logos', 'teams', 'ads'];
uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '..', 'uploads', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Depolama ayarları
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'logos';
    if (req.path.includes('team-logo')) folder = 'teams';
    else if (req.path.includes('ad')) folder = 'ads';
    cb(null, path.join(__dirname, '..', 'uploads', folder));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// Dosya filtresi - sadece resim dosyaları
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Sadece resim dosyaları yüklenebilir (JPEG, PNG, GIF, WebP, SVG)'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 }
});

module.exports = upload;
