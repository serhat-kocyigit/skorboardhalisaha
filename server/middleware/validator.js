/**
 * Validator Middleware - Request doğrulama
 */
function validateRequired(fields) {
  return (req, res, next) => {
    const missing = fields.filter(f => !req.body[f] && req.body[f] !== 0);
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Zorunlu alanlar eksik: ${missing.join(', ')}`
      });
    }
    next();
  };
}

module.exports = { validateRequired };
