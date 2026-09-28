/**
 * Error Handler Middleware - Merkezi hata yönetimi
 */
function errorHandler(err, req, res, next) {
  console.error('❌ Hata:', err.message);

  // Multer hataları
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'Dosya boyutu çok büyük (maksimum 5MB)'
    });
  }

  if (err.message && err.message.includes('resim dosyaları')) {
    return res.status(400).json({ success: false, message: err.message });
  }

  // Genel hata
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Sunucu hatası' : err.message
  });
}

module.exports = errorHandler;
