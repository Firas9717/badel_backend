const Notification = require('../models/Notification');

async function getNotifications(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('relatedUser', 'firstName lastName profilePhoto').populate('relatedOffer', 'title photos');
    const total = await Notification.countDocuments({ user: req.user._id });
    return res.status(200).json({ success: true, count: notifications.length, total, page, totalPages: Math.ceil(total / limit), notifications });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function markAsRead(req, res) {
  try {
    const n = await Notification.findById(req.params.id);
    if (!n) return res.status(404).json({ success: false, message: 'Notification not found' });
    if (n.user.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Not authorized' });
    n.isRead = true;
    await n.save();
    return res.status(200).json({ success: true, notification: n });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function markAllAsRead(req, res) {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { $set: { isRead: true } });
    return res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function getUnreadCount(req, res) {
  try {
    const count = await Notification.countDocuments({ user: req.user._id, isRead: false });
    return res.status(200).json({ success: true, unreadCount: count });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

module.exports = { getNotifications, markAsRead, markAllAsRead, getUnreadCount };
