const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const { uploadImage, uploadAudio } = require('../utils/fileUpload');
const { sendToUser } = require('../config/socket');

async function getConversations(req, res) {
  try {
    const convs = await Conversation.find({ participants: req.user._id })
      .sort({ updatedAt: -1 })
      .populate('participants', 'firstName lastName profilePhoto trustScore isActive')
      .populate('relatedOffer', 'title photos status')
      .populate('activeOffers', 'title photos status')
      .populate('relatedDeal', 'status');
      
    const conversations = [];
    for (const c of convs) {
      const unread = await Message.countDocuments({ conversation: c._id, readBy: { $ne: req.user._id } });
      const lastMsg = await Message.findOne({ conversation: c._id }).sort({ createdAt: -1 }).select('content createdAt type sender');
      const obj = c.toObject();
      obj.unreadCount = unread;
      obj.lastMessage = lastMsg ? lastMsg.toObject() : null;
      conversations.push(obj);
    }
    return res.status(200).json({ success: true, count: conversations.length, conversations });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function getMessages(req, res) {
  try {
    const conv = await Conversation.findById(req.params.conversationId).populate('activeOffers', 'title photos status');
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });
    if (!conv.participants.map(p => p.toString()).includes(req.user._id.toString())) return res.status(403).json({ success: false, message: 'Not authorized' });
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const query = { conversation: conv._id };
    const { offerId } = req.query;
    if (offerId && offerId !== 'all') {
      if (offerId === 'null' || offerId === 'general') {
        query.relatedOffer = null;
      } else {
        query.relatedOffer = offerId;
      }
    }

    let messages = await Message.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('sender', 'firstName lastName profilePhoto');
    await Message.updateMany({ conversation: conv._id, readBy: { $ne: req.user._id } }, { $addToSet: { readBy: req.user._id } });
    messages = messages.reverse();
    return res.status(200).json({ success: true, count: messages.length, page, messages, activeOffers: conv.activeOffers });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function sendMessage(req, res) {
  try {
    const { conversationId, content, offerId } = req.body || {};
    let type = (req.body || {}).type || 'text';
    const conv = await Conversation.findById(conversationId);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });
    if (!conv.participants.map(p => p.toString()).includes(req.user._id.toString())) return res.status(403).json({ success: false, message: 'Not authorized' });

    let image = null;
    let audio = null;

    if (req.file) {
      if (type === 'vocal' || req.file.mimetype.startsWith('audio/')) {
        const result = await uploadAudio(req.file, 'messages');
        if (result) {
          audio = { url: result.secure_url, cloudinaryId: result.public_id };
          type = 'vocal';
        }
      } else {
        const result = await uploadImage(req.file, 'messages');
        if (result) {
          image = { url: result.secure_url, cloudinaryId: result.public_id };
          type = 'image';
        }
      }
    }

    const msgData = {
      conversation: conv._id,
      sender: req.user._id,
      content,
      type,
      image,
      audio,
      readBy: [req.user._id]
    };

    if (offerId && offerId !== 'null' && offerId !== 'general') {
      msgData.relatedOffer = offerId;
      if (!conv.activeOffers.map(o => o.toString()).includes(offerId.toString())) {
        await Conversation.findByIdAndUpdate(conv._id, { $addToSet: { activeOffers: offerId } });
      }
    }

    const msg = await Message.create(msgData);
    await msg.populate('sender', 'firstName lastName profilePhoto');
    const other = conv.participants.find(p => p.toString() !== req.user._id.toString());
    if (other) {
      try { sendToUser(other.toString(), 'new_message', { message: msg, conversationId: conv._id }); } catch (e) { console.error('Socket error new_message:', e); }
      
      const notification = await Notification.create({ user: other, type: 'new_message', title: 'Nouveau Message', message: `Vous avez reçu un nouveau message`, relatedConversation: conv._id });
      try { sendToUser(other.toString(), 'new_notification', notification); } catch (e) { console.error('Socket error new_notification:', e); }
    }
    return res.status(201).json({ success: true, message: msg });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function startConversation(req, res) {
  try {
    const { otherUserId, offerId } = req.body || {};
    if (otherUserId === req.user._id.toString()) return res.status(400).json({ success: false, message: 'Cannot start conversation with yourself' });
    
    let conv = await Conversation.findOne({ participants: { $all: [req.user._id, otherUserId] } });
    
    if (conv) {
      let changed = false;
      if (conv.type !== 'contact') {
        conv.type = 'contact';
        changed = true;
      }
      if (offerId) {
        if (!conv.activeOffers.map(o => o.toString()).includes(offerId.toString())) {
          conv.activeOffers.push(offerId);
          conv.relatedOffer = offerId; // Keep relatedOffer updated for compatibility
          changed = true;
        }
      }
      if (changed) {
        await conv.save();
      }
      conv = await Conversation.findById(conv._id)
        .populate('participants', 'firstName lastName profilePhoto trustScore isActive')
        .populate('activeOffers', 'title photos status');
      return res.status(200).json({ success: true, conversation: conv, isNew: false });
    }

    const newConvData = { participants: [req.user._id, otherUserId], type: 'contact' };
    if (offerId) {
      newConvData.relatedOffer = offerId;
      newConvData.activeOffers = [offerId];
    }

    conv = await Conversation.create(newConvData);
    conv = await Conversation.findById(conv._id)
      .populate('participants', 'firstName lastName profilePhoto trustScore isActive')
      .populate('activeOffers', 'title photos status');
    return res.status(201).json({ success: true, conversation: conv, isNew: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function getUnreadCount(req, res) {
  try {
    const convs = await Conversation.find({ participants: req.user._id }).select('_id');
    const ids = convs.map(c => c._id);
    const count = await Message.countDocuments({ conversation: { $in: ids }, readBy: { $ne: req.user._id }, sender: { $ne: req.user._id } });
    return res.status(200).json({ success: true, unreadCount: count });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

module.exports = { getConversations, getMessages, sendMessage, startConversation, getUnreadCount };
