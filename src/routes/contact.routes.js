const express = require('express');
const router = express.Router();
const ContactMessage = require('../models/ContactMessage');

// POST /api/contact — Submit a message from the footer form
router.post('/', async (req, res) => {
    try {
        const { message, senderName, senderEmail } = req.body;
        if (!message || !message.trim()) {
            return res.status(400).json({ success: false, message: 'Le message est requis.' });
        }

        // Try to get user from cookie/auth if available
        let userId = null;
        let name = senderName || 'Anonyme';
        let email = senderEmail || '';

        try {
            const jwt = require('jsonwebtoken');
            const token = req.cookies?.token;
            if (token) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                userId = decoded.id || decoded._id;
                const User = require('../models/User');
                const user = await User.findById(userId).select('firstName lastName email').lean();
                if (user) {
                    name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || name;
                    email = user.email || email;
                }
            }
        } catch (e) { /* No auth, proceed as anonymous */ }

        const contactMsg = await ContactMessage.create({
            message: message.trim(),
            senderName: name,
            senderEmail: email,
            user: userId,
            page: req.body.page || 'badel.html'
        });

        res.status(201).json({ success: true, message: 'Message envoyé avec succès!' });
    } catch (err) {
        console.error('Contact message error:', err);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
});

// GET /api/contact — Get all contact messages (for admin)
router.get('/', async (req, res) => {
    try {
        const messages = await ContactMessage.find()
            .populate('user', 'firstName lastName email profilePhoto')
            .sort({ createdAt: -1 })
            .lean();
        res.json({ success: true, data: messages });
    } catch (err) {
        console.error('Get contact messages error:', err);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
});

// PATCH /api/contact/:id/status — Update message status
router.patch('/:id/status', async (req, res) => {
    try {
        const { status, adminNote } = req.body;
        const update = {};
        if (status) update.status = status;
        if (adminNote !== undefined) update.adminNote = adminNote;

        const msg = await ContactMessage.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!msg) return res.status(404).json({ success: false, message: 'Message non trouvé.' });
        res.json({ success: true, data: msg });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
});

// DELETE /api/contact/:id — Delete a message
router.delete('/:id', async (req, res) => {
    try {
        await ContactMessage.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Supprimé.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
});

module.exports = router;
