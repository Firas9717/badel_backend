const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
    senderName: { type: String, default: 'Anonyme' },
    senderEmail: { type: String, default: '' },
    message: { type: String, required: true, maxlength: 2000 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    page: { type: String, default: 'badel.html' },
    status: { 
        type: String, 
        enum: ['nouveau', 'lu', 'répondu', 'archivé'], 
        default: 'nouveau' 
    },
    adminNote: { type: String, default: '' }
}, { timestamps: true });

contactMessageSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
