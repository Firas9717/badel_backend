const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    eventName: { 
        type: String, 
        required: true,
        index: true
    },
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        default: null
    },
    properties: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    device: {
        type: String,
        default: 'unknown'
    },
    source: {
        type: String,
        default: 'direct'
    },
    ipAddress: {
        type: String,
        select: false // Keep private
    }
}, { timestamps: true });

// Optimize for common queries like finding events by date and type
eventSchema.index({ eventName: 1, createdAt: -1 });

module.exports = mongoose.model('Event', eventSchema);
