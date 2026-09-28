/**
 * Socket.IO Client Wrapper
 * Tüm frontend sayfaları bu modülü kullanır
 */
const SocketClient = {
  socket: null,
  connected: false,
  listeners: {},

  /** Socket.IO bağlantısını başlat */
  connect() {
    const protocol = window.location.protocol;
    const host = window.location.host;
    this.socket = io(`${protocol}//${host}`);

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('🔌 Socket bağlandı:', this.socket.id);
      // Bağlandığında tam state senkronizasyonu iste
      this.socket.emit('match:requestSync');
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      console.log('🔌 Socket bağlantısı koptu');
    });

    return this.socket;
  },

  /** Event dinle */
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  },

  /** Event gönder */
  emit(event, data) {
    if (this.socket && this.connected) {
      this.socket.emit(event, data);
    }
  },

  /** Bağlantıyı kes */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
};
