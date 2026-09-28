/**
 * Layout Socket Handler - Tasarım editörü socket event'leri
 */
const Layout = require('../models/Layout');

module.exports = function(io, socket) {
  /** Layout güncelleme (drag & drop'tan gelen) */
  socket.on('layout:save', async (data) => {
    try {
      const { id, config } = data;
      if (id) {
        await Layout.update(id, { config });
        const layout = await Layout.getById(id);
        if (layout && layout.is_active) {
          io.emit('layout:updated', layout);
        }
      }
    } catch (error) {
      console.error('layout:save hatası:', error.message);
    }
  });
};
