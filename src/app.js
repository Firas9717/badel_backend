const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');
const logger = require('./config/logger');

const session = require('express-session');
const passport = require('passport');
require('./config/passport'); // Load passport config

const app = express();

// ── استيراد الـ Middlewares ──
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// ── 1. HTTP Logging (Morgan + Winston) ──
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
    stream: { write: (message) => logger.info(message.trim()) }
}));

// ── 2. Security & CORS ──
const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? (process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(o => o.trim()) : []) // Strict Prod (supports comma-separated URLs)
    : [
        ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(o => o.trim()) : []),
        'http://localhost:5000',
        'http://localhost:5500',
        'http://localhost:8080',
        'http://127.0.0.1:5000',
        'http://127.0.0.1:5500',
        'http://127.0.0.1:8080'
    ].filter(Boolean); // Relaxed Dev

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`[CORS Blocked] Origin: ${origin}`);
            callback(null, false); // Block the origin by passing false, which returns standard CORS headers mismatch to browser instead of throwing a 500 error
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Strict Security Headers
app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
            connectSrc: ["'self'", "https://api.cloudinary.com"],
        }
    } : false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// ── 3. Request Parsing ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Sessions for passport (needed for Google OAuth state)
app.use(session({
    secret: process.env.JWT_SECRET || 'badel_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(compression());

// ── 4. Static Files (Uploads) ──
const uploadsPath = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsPath, {
    setHeaders: (res) => {
        res.set('Access-Control-Allow-Origin', process.env.CLIENT_URL || 'http://localhost:8080');
        res.set('Cache-Control', 'public, max-age=86400');
    }
}));

// ── 5. Global Rate Limiting ──
app.use('/api', apiLimiter);

// ── 6. Routes ──
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/offers', require('./routes/offer.routes'));
app.use('/api/deals', require('./routes/deal.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/preferences', require('./routes/preferences.routes'));
app.use('/api/messages', require('./routes/message.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/matches', require('./routes/match.routes'));
app.use('/api/reports', require('./routes/report.routes'));
app.use('/api/reviews', require('./routes/review.routes'));
app.use('/api/search', require('./routes/search.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/contact', require('./routes/contact.routes'));

// ── TEST ROUTE: إرسال إشعار تجريبي ──
app.get('/api/test-notification/:userId', (req, res) => {
    const { userId } = req.params;
    const io = app.get('io');
    
    io.to(`user_${userId}`).emit('newMessage', {
        from: 'نظام الاختبار',
        content: 'هذا إشعار تجريبي من السيرفر!',
        timestamp: new Date()
    });
    
    res.json({ 
        success: true, 
        message: `تم إرسال إشعار للغرفة user_${userId}` 
    });
});

// ── 7. Servir le frontend statique ──
const frontendPath = path.join(__dirname, '..', '..', '..', 'front end');
app.use(express.static(frontendPath, {
    maxAge: '1y', // Cache for 1 year, relies on versioning for cache busting
    extensions: ['html', 'htm'],
    setHeaders: (res, filePath) => {
        // If needed, we can still set no-cache for specific files, but for production, static assets should be cached
        if (filePath.endsWith('.html')) {
            // HTML files should revalidate
            res.set('Cache-Control', 'no-cache');
        }
    }
}));

// Route pour servir badel.html par défaut على الـ racine
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'badel.html'));
});

// ── 8. Error Handling (Must be last) ──
app.use((req, res, next) => {
    res.status(404).json({ success: false, message: 'المسار هذا مش موجود.' });
});

app.use(errorHandler);

module.exports = app;
