// ═══════════════════════════════════════════════════════
//  BADEL — Secure Upload Middleware (src/middleware/upload.js)
// ═══════════════════════════════════════════════════════

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// ── إنشاء المجلدات إذا مش موجودة ──
const uploadPath = path.join('uploads', 'offers');
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

// ── إعدادات التخزين ──
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // اسم فريد: timestamp + 16 bytes random hex + extension
        const timestamp = Date.now();
        const randomHex = crypto.randomBytes(16).toString('hex');
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${timestamp}-${randomHex}${ext}`);
    }
});

// ── فلتر الصور (التحقق من mimetype) ──
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('الصور المسموح بيها هي jpeg, jpg, png, webp بركا!'), false);
    }
};

// ── إعداد مولتر ──
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB كحد أقصى للصورة
        files: 5 // 5 صور كحد أقصى لكل إعلان
    }
});

module.exports = upload;
