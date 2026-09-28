/**
 * Layout Controller - Skorboard tasarım editörü işlemleri
 */
const Layout = require('../models/Layout');

const layoutController = {
  async getAll(req, res) {
    try {
      const layouts = await Layout.getAll();
      res.json({ success: true, data: layouts });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async getActive(req, res) {
    try {
      const layout = await Layout.getActive();
      res.json({ success: true, data: layout });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async create(req, res) {
    try {
      const { name, config } = req.body;
      if (!name || !config) {
        return res.status(400).json({ success: false, message: 'İsim ve konfigürasyon zorunludur' });
      }
      const layout = await Layout.create({ name, config });
      res.status(201).json({ success: true, data: layout });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async update(req, res) {
    try {
      const layout = await Layout.update(req.params.id, req.body);
      if (!layout) return res.status(404).json({ success: false, message: 'Layout bulunamadı' });
      if (layout.is_active) {
        const io = req.app.get('io');
        if (io) io.emit('layout:updated', layout);
      }
      res.json({ success: true, data: layout });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async activate(req, res) {
    try {
      const layout = await Layout.activate(req.params.id);
      if (!layout) return res.status(404).json({ success: false, message: 'Layout bulunamadı' });
      const io = req.app.get('io');
      if (io) io.emit('layout:updated', layout);
      res.json({ success: true, data: layout });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = layoutController;
