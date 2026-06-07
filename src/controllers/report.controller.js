const Report = require('../models/Report');

async function createReport(req, res) {
  try {
    const { type, targetOffer, targetUser, targetMessage, reason, description } = req.body || {};
    if (type === 'offer' && !targetOffer) return res.status(400).json({ success: false, message: 'targetOffer is required' });
    if (type === 'user' && !targetUser) return res.status(400).json({ success: false, message: 'targetUser is required' });
    if (type === 'message' && !targetMessage) return res.status(400).json({ success: false, message: 'targetMessage is required' });

    const exists = await Report.findOne({ reporter: req.user._id, type, ...(targetOffer && { targetOffer }), ...(targetUser && { targetUser }), ...(targetMessage && { targetMessage }), status: { $in: ['pending','reviewed'] } });
    if (exists) return res.status(400).json({ success: false, message: 'You have already reported this' });

    const report = await Report.create({ reporter: req.user._id, type, targetOffer, targetUser, targetMessage, reason, description });
    return res.status(201).json({ success: true, message: 'Report submitted successfully', report });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function getMyReports(req, res) {
  try {
    const reports = await Report.find({ reporter: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: reports.length, reports });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

module.exports = { createReport, getMyReports };
