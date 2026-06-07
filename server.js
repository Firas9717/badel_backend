// ── 1. Load Env Vars ──
require('dotenv').config();

// ── 2. Validate Env Vars ──
const validateEnv = require('./src/config/env');
validateEnv();

const http = require('http');
const mongoose = require('mongoose');
const app = require('./src/app');
const logger = require('./src/config/logger');
const { setupSocket } = require('./src/config/socket');

const PORT = process.env.PORT || 5000;

// ── 3. Create HTTP Server ──
const server = http.createServer(app);

// ── 4. Setup Socket.io ──
const io = setupSocket(server);
app.set('io', io);

// ── 5. Connect to DB, THEN Start Server ──
async function startServer() {
    try {
        logger.info('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 15000,
        });
        logger.info('✅ Connected to MongoDB successfully');

        // Run self-healing duplicate conversation merge
        const { mergeDuplicateConversations } = require('./src/utils/mergeConvs');
        await mergeDuplicateConversations();

        // Démarrer le serveur sur toutes les interfaces (0.0.0.0)
        server.listen(PORT, '0.0.0.0', () => {
            logger.info(`🚀 BADEL Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
        });
    } catch (err) {
        logger.error(`❌ MongoDB connection failed: ${err.message}`);
        logger.error('🚨 Server will NOT start without a database connection.');
        process.exit(1);
    }
}

startServer();

// ── 6. Process Error Handling ──
process.on('unhandledRejection', (err) => {
    logger.error(`🚨 Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
    logger.error(`🚨 Uncaught Exception: ${err.message}`);
    process.exit(1);
});
