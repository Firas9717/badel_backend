const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// ── Configuration du Stockage (Mémoire pour compatibilité Cloudinary/Fallback) ──
const storage = multer.memoryStorage();

// ── Filtre de Fichiers (Type & Mime) ──
const fileFilter = (req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|webp|webm|mp3|wav/;
    const allowedMimetypes = /image\/jpeg|image\/png|image\/webp|audio\/webm|audio\/mpeg|audio\/wav|audio\/x-wav/;

    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimetypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('الصور المسموح بيها هي jpeg, jpg, png, webp بركا، و الصوتي webm, mp3!'));
    }
};

// ── Instance Multer ──
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB max par image
        files: 5 // 5 images max
    },
    fileFilter: fileFilter
});

module.exports = upload;
