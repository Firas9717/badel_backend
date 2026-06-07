// ═══════════════════════════════════════════════════════
//  BADEL — Secure Socket.io Config (src/config/socket.js)
// ═══════════════════════════════════════════════════════

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const logger = require('./logger');

let ioInstance;

const setupSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: [process.env.CLIENT_URL, 'http://localhost:5500', 'http://localhost:5000', 'http://localhost:8080'].filter(Boolean),
            credentials: true
        }
    });
    
    ioInstance = io;

    // ── Middleware للأمان (Cookie + Auth Token) ──
    io.use((socket, next) => {
        try {
            let token = null;

            // 1. Try auth.token from handshake (frontend sends this)
            if (socket.handshake.auth && socket.handshake.auth.token) {
                token = socket.handshake.auth.token;
            }

            // 2. Fallback: try cookie-based token
            if (!token && socket.handshake.headers.cookie) {
                const parsedCookies = cookie.parse(socket.handshake.headers.cookie);
                token = parsedCookies.token;
            }

            if (!token) {
                logger.warn('Socket Auth: No token found in auth or cookies');
                return next(new Error('unauthorized'));
            }

            // التحقق من التوكن
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id; // تخزين الـ id في السوكيت
            
            next();
        } catch (err) {
            logger.error(`Socket Auth Error: ${err.message}`);
            next(new Error('unauthorized'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.userId;
        
        // الانضمام لغرفة خاصة بالمستخدم لاستقبال التنبيهات
        if (userId) {
            socket.join(`user_${userId}`);
            logger.info(`🔌 Socket Connected: User ${userId} (Auth)`);
            // Store socket instance for forced disconnections
            if (!io.userSockets) io.userSockets = {};
            if (!io.userSockets[userId]) io.userSockets[userId] = [];
            io.userSockets[userId].push(socket);
        }

        // دعم الانضمام اليدوي للاختبار (Manual Join)
        socket.on('join', (roomUserId) => {
            socket.join(`user_${roomUserId}`);
            logger.info(`🔌 Socket Manual Join: Room user_${roomUserId}`);
        });

        // 1. إرسال رسالة (Private Messaging)
        socket.on('sendMessage', (data) => {
            const { receiverId, content, conversationId } = data;

            if (!content || content.trim().length === 0 || content.length > 1000) {
                return;
            }

            // إرسال للمستقبل فقط في غرفته الخاصة
            io.to(`user_${receiverId}`).emit('newMessage', {
                senderId: userId,
                content: content.trim(),
                conversationId,
                timestamp: new Date()
            });

            logger.info(`💬 Message sent from ${userId} to ${receiverId}`);
        });

        // 2. تنبيه بعرض جديد (New Deal Notification)
        socket.on('newDeal', (data) => {
            const { receiverId, dealId, offerTitle } = data;
            
            io.to(`user_${receiverId}`).emit('dealNotification', {
                type: 'NEW_DEAL',
                dealId,
                message: `وصلك عرض جديد على: ${offerTitle}`,
                timestamp: new Date()
            });

            logger.info(`🔔 New Deal alert sent to ${receiverId}`);
        });

        // 3. الرد على عرض (Deal Response Notification)
        socket.on('dealResponse', (data) => {
            const { receiverId, dealId, status } = data;

            if (!['accepted', 'rejected'].includes(status)) return;

            const msg = status === 'accepted' ? 'موافقة' : 'رفض';

            io.to(`user_${receiverId}`).emit('dealResponseNotification', {
                status,
                dealId,
                message: `تمت الـ ${msg} على عرضك.`,
                timestamp: new Date()
            });

            logger.info(`📩 Deal response (${status}) sent to ${receiverId}`);
        });

        socket.on('disconnect', () => {
            logger.info(`🔌 Socket Disconnected: User ${userId}`);
            if (userId && io.userSockets && io.userSockets[userId]) {
                io.userSockets[userId] = io.userSockets[userId].filter(s => s.id !== socket.id);
            }
        });
    });

    return io;
};

const sendToUser = (userId, eventName, data) => {
    if (ioInstance) {
        ioInstance.to(`user_${userId}`).emit(eventName, data);
        logger.info(`📤 Server emitted '${eventName}' to user_${userId}`);
    } else {
        logger.warn(`⚠️ Socket.io instance not found when trying to emit '${eventName}'`);
    }
};

const disconnectUser = (userId) => {
    if (ioInstance && ioInstance.userSockets && ioInstance.userSockets[userId]) {
        ioInstance.userSockets[userId].forEach(socket => {
            socket.emit('force_disconnect', { reason: 'banned' });
            socket.disconnect(true);
        });
        logger.info(`🔌 Forced disconnection for user ${userId}`);
    }
};

module.exports = { setupSocket, sendToUser, disconnectUser };
