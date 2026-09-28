/**
 * Socket.IO Konfigürasyonu ve Event Handler Bağlama
 * Tüm socket event'lerini merkezi olarak yönetir
 */
const { Server } = require('socket.io');

// Socket event handler modülleri
const matchSocket = require('../sockets/matchSocket');
const scoreSocket = require('../sockets/scoreSocket');
const timerSocket = require('../sockets/timerSocket');
const cardSocket = require('../sockets/cardSocket');
const layoutSocket = require('../sockets/layoutSocket');

/**
 * Socket.IO sunucusunu başlatır ve event handler'ları bağlar
 * @param {import('http').Server} httpServer - HTTP sunucu instance'ı
 * @returns {import('socket.io').Server} Socket.IO sunucusu
 */
function initializeSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    pingInterval: 10000,
    pingTimeout: 5000
  });

  // Bağlantı event'i
  io.on('connection', (socket) => {
    console.log(`🔌 Yeni bağlantı: ${socket.id}`);

    // Tüm socket event handler'larını bağla
    matchSocket(io, socket);
    scoreSocket(io, socket);
    timerSocket(io, socket);
    cardSocket(io, socket);
    layoutSocket(io, socket);

    // Bağlantı koptuğunda
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Bağlantı koptu: ${socket.id} - ${reason}`);
    });

    // Hata yakalama
    socket.on('error', (error) => {
      console.error(`❌ Socket hatası (${socket.id}):`, error.message);
    });
  });

  console.log('🔌 Socket.IO başlatıldı');
  return io;
}

module.exports = { initializeSocket };
