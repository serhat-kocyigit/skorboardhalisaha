/**
 * REST API Client
 * DÜZELTİLDİ: Tüm metodlarda try/catch — network hatası paneli çökertmez
 */
const API = {
  baseUrl: '/api',

  /** Hata nesnesi döndür */
  _err(e) {
    console.error('[API Error]', e);
    return { success: false, message: e.message || 'Ağ bağlantısı hatası' };
  },

  /** GET isteği */
  async get(endpoint) {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`);
      if (!res.ok) return { success: false, message: `HTTP ${res.status}` };
      return res.json();
    } catch (e) { return this._err(e); }
  },

  /** POST isteği */
  async post(endpoint, data) {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok && res.status !== 201) {
        // 201 Created da başarılı sayılır, json parse et
      }
      return res.json();
    } catch (e) { return this._err(e); }
  },

  /** PUT isteği */
  async put(endpoint, data) {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) return { success: false, message: `HTTP ${res.status}` };
      return res.json();
    } catch (e) { return this._err(e); }
  },

  /** DELETE isteği */
  async delete(endpoint) {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, { method: 'DELETE' });
      if (!res.ok) return { success: false, message: `HTTP ${res.status}` };
      return res.json();
    } catch (e) { return this._err(e); }
  },

  /** FormData ile dosya yükleme */
  async upload(endpoint, formData) {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) return { success: false, message: `HTTP ${res.status}` };
      return res.json();
    } catch (e) { return this._err(e); }
  }
};
