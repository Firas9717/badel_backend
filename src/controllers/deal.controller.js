const Deal = require('../models/Deal');
const Offer = require('../models/Offer');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const { logAction } = require('../utils/audit');
const { sendToUser } = require('../config/socket');

async function proposeDeal(req, res) {
  try {
    const { offererOfferId, receiverOfferId, moneyComplement, message } = req.body || {};
    const offererOffer = await Offer.findById(offererOfferId);
    if (!offererOffer) return res.status(404).json({ success: false, message: 'Your offer not found' });
    if (offererOffer.user.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Offer does not belong to you' });
    const receiverOffer = await Offer.findById(receiverOfferId);
    if (!receiverOffer) return res.status(404).json({ success: false, message: 'Receiver offer not found' });
    const receiverUserId = receiverOffer.user;
    if (receiverUserId.toString() === req.user._id.toString()) return res.status(400).json({ success: false, message: 'Cannot create deal with yourself' });

    const existing = await Deal.findOne({ offererOffer: offererOfferId, receiverOffer: receiverOfferId, status: { $in: ['proposed','counter_offered','accepted','meeting_scheduled'] } });
    if (existing) return res.status(400).json({ success: false, message: 'An active deal already exists for these offers' });

    let conversation = await Conversation.findOne({ participants: { $all: [req.user._id, receiverUserId] } });
    if (!conversation) {
      conversation = await Conversation.create({ participants: [req.user._id, receiverUserId], type: 'contact' });
    }

    if (receiverOfferId) {
      const offerIdStr = receiverOfferId.toString();
      if (!conversation.activeOffers.map(o => o.toString()).includes(offerIdStr)) {
        conversation.activeOffers.push(receiverOfferId);
      }
      conversation.relatedOffer = receiverOfferId;
      await conversation.save();
    }

    const deal = await Deal.create({ offerer: req.user._id, receiver: receiverUserId, offererOffer: offererOfferId, receiverOffer: receiverOfferId, moneyComplement, message: message || '', conversation: conversation._id });

    const getInfo = (off) => off ? { title: off.title || 'Article', photo: (off.photos && off.photos[0]) ? off.photos[0] : null } : null;
    await Message.create({ conversation: conversation._id, sender: req.user._id, type: 'counter_offer', dealProposal: deal._id, dealMeta: { action: 'propose', offererOffer: getInfo(offererOffer), receiverOffer: getInfo(receiverOffer), moneyAmount: moneyComplement && moneyComplement.amount ? moneyComplement.amount : null, counterMessage: message || null }, relatedOffer: receiverOfferId, readBy: [req.user._id] });

    const notification = await Notification.create({ user: receiverUserId, type: 'deal_proposed', title: 'New Deal Proposal', message: `${req.user.firstName || ''} wants to exchange "${offererOffer.title}" for your "${receiverOffer.title}"`, relatedDeal: deal._id, relatedOffer: receiverOfferId, relatedUser: req.user._id });
    try { sendToUser(receiverUserId.toString(), 'new_deal', { deal, notification }); } catch (e) { console.error('Socket error:', e); }

    receiverOffer.proposalsReceived = (receiverOffer.proposalsReceived || 0) + 1;
    // Marquer le dernier action par l'offerer
    deal.lastActionBy = req.user._id;

    await receiverOffer.save();

    await deal.populate('offerer receiver offererOffer receiverOffer conversation');
    return res.status(201).json({ success: true, deal });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function respondToDeal(req, res) {
  try {
    const { action, counterOffer } = req.body || {};
    const deal = await Deal.findById(req.params.id).populate('offererOffer receiverOffer');
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });

    // Vérifier que le user est bien un participant
    const myId = req.user._id.toString();
    const offererId  = deal.offerer.toString();
    const receiverId = deal.receiver.toString();
    if (myId !== offererId && myId !== receiverId) {
      return res.status(403).json({ success: false, message: 'Not a participant in this deal' });
    }

    // Vérifier que c'est bien le tour de ce user (celui qui n'a PAS fait la dernière action)
    const lastBy = deal.lastActionBy ? deal.lastActionBy.toString() : null;
    if (lastBy && lastBy === myId) {
      return res.status(403).json({ success: false, message: 'Ce n\'est pas votre tour de répondre' });
    }

    if (!['proposed', 'counter_offered'].includes(deal.status)) {
      return res.status(400).json({ success: false, message: 'Cannot respond to this deal' });
    }

    // Déterminer l'autre participant pour les notifications
    const otherId = myId === offererId ? deal.receiver : deal.offerer;

    if (action === 'accept') {
      deal.status = 'accepted';
      deal.lastActionBy = req.user._id;
      await Notification.create({ user: otherId, type: 'deal_accepted', title: 'Deal Accepted', message: `${req.user.firstName || ''} accepted your deal`, relatedDeal: deal._id, relatedUser: req.user._id });
    } else if (action === 'reject') {
      deal.status = 'cancelled';
      deal.cancelledAt = Date.now();
      deal.cancelledBy = req.user._id;
      deal.cancellationReason = 'Rejected';
      deal.lastActionBy = req.user._id;
      await Notification.create({ user: otherId, type: 'deal_cancelled', title: 'Deal Rejected', message: `${req.user.firstName || ''} rejected your deal`, relatedDeal: deal._id, relatedUser: req.user._id });
    } else if (action === 'counter') {
      const amount = counterOffer && counterOffer.newMoneyAmount ? Number(counterOffer.newMoneyAmount) : null;
      if (amount !== null && amount < 0) return res.status(400).json({ success: false, message: 'Money amount must be positive' });

      if (counterOffer) {
        if (myId === offererId && counterOffer.newOffererOffer && counterOffer.newOffererOffer.toString() !== (deal.offererOffer._id || deal.offererOffer).toString()) {
           const checkOffer = await Offer.findOne({ _id: counterOffer.newOffererOffer, user: myId });
           if (!checkOffer) return res.status(403).json({ success: false, message: 'Invalid offer ownership' });
           deal.offererOffer = checkOffer._id;
        }
        if (myId === receiverId && counterOffer.newReceiverOffer && counterOffer.newReceiverOffer.toString() !== (deal.receiverOffer._id || deal.receiverOffer).toString()) {
           const checkOffer = await Offer.findOne({ _id: counterOffer.newReceiverOffer, user: myId });
           if (!checkOffer) return res.status(403).json({ success: false, message: 'Invalid offer ownership' });
           deal.receiverOffer = checkOffer._id;
        }
      }

      deal.status = 'counter_offered';
      deal.lastActionBy = req.user._id;
      deal.counterOffer = {
        message: counterOffer && counterOffer.message,
        newMoneyAmount: amount,
        createdAt: new Date()
      };

      await Notification.create({ user: otherId, type: 'deal_proposed', title: 'Counter Offer', message: `${req.user.firstName || ''} sent a counter offer`, relatedDeal: deal._id, relatedUser: req.user._id });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    await deal.save();
    await deal.populate('offerer receiver offererOffer receiverOffer conversation');

    // Créer un message riche dans la conversation selon l'action
    let msgData = {
      conversation: deal.conversation,
      sender: req.user._id,
      readBy: [req.user._id],
      relatedOffer: deal.receiverOffer ? (deal.receiverOffer._id || deal.receiverOffer) : null
    };

    if (action === 'counter') {
      // Extraire les infos produits pour le card
      const getOfferInfo = (offer) => offer ? {
        title: offer.title || 'Article',
        photo: (offer.photos && offer.photos[0]) ? offer.photos[0] : null
      } : null;

      msgData.type = 'counter_offer';
      msgData.dealMeta = {
        action: 'counter',
        offererOffer:   getOfferInfo(deal.offererOffer),
        receiverOffer:  getOfferInfo(deal.receiverOffer),
        moneyAmount:    counterOffer && counterOffer.newMoneyAmount ? counterOffer.newMoneyAmount : null,
        counterMessage: counterOffer && counterOffer.message ? counterOffer.message : null
      };
    } else if (action === 'accept') {
      msgData.type = 'system';
      msgData.content = '\u2705 ' + (req.user.firstName || 'Utilisateur') + ' a accept\u00e9 le deal !';
    } else if (action === 'reject') {
      msgData.type = 'system';
      msgData.content = '\u274c ' + (req.user.firstName || 'Utilisateur') + ' a refus\u00e9 le deal.';
    }

    await Message.create(msgData);

    try { sendToUser(otherId.toString(), 'deal_response', { dealId: deal._id, action }); } catch (e) {}
    return res.status(200).json({ success: true, deal });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function acceptCounter(req, res) {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });
    if (deal.offerer.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Only the offerer can accept' });
    if (deal.status !== 'counter_offered') return res.status(400).json({ success: false, message: 'Deal is not in counter_offered state' });
    deal.status = 'accepted';
    if (deal.counterOffer && deal.counterOffer.newMoneyAmount) {
      deal.moneyComplement = deal.moneyComplement || {};
      deal.moneyComplement.amount = deal.counterOffer.newMoneyAmount;
    }
    await deal.save();
    await Notification.create({ user: deal.receiver, type: 'deal_accepted', title: 'Counter Accepted', message: `${req.user.firstName || ''} accepted your counter offer`, relatedDeal: deal._id, relatedUser: req.user._id });
    return res.status(200).json({ success: true, deal });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function setMeeting(req, res) {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });
    if (![deal.offerer.toString(), deal.receiver.toString()].includes(req.user._id.toString())) return res.status(403).json({ success: false, message: 'Not authorized' });
    if (deal.status !== 'accepted') return res.status(400).json({ success: false, message: 'Deal must be accepted first' });
    deal.meetingDetails = (req.body || {}).meetingDetails;
    deal.status = 'meeting_scheduled';
    await deal.save();
    const other = deal.offerer.toString() === req.user._id.toString() ? deal.receiver : deal.offerer;
    await Notification.create({ user: other, type: 'deal_proposed', title: 'Meeting Scheduled', message: `Meeting scheduled by ${req.user.firstName || ''}`, relatedDeal: deal._id, relatedUser: req.user._id });
    await Message.create({ conversation: deal.conversation, sender: req.user._id, content: `Meeting scheduled`, type: 'system', relatedOffer: deal.receiverOffer ? (deal.receiverOffer._id || deal.receiverOffer) : null, readBy: [req.user._id] });
    return res.status(200).json({ success: true, deal });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function confirmExchange(req, res) {
  try {
    const deal = await Deal.findById(req.params.id).populate('offererOffer receiverOffer');
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });
    if (![deal.offerer.toString(), deal.receiver.toString()].includes(req.user._id.toString())) return res.status(403).json({ success: false, message: 'Not authorized' });
    if (!['accepted','meeting_scheduled'].includes(deal.status)) return res.status(400).json({ success: false, message: 'Deal not in confirmable state' });
    const fieldToUpdate = (req.user._id.toString() === deal.offerer.toString()) ? 'offererConfirmed' : 'receiverConfirmed';
    const updatedDeal = await Deal.findOneAndUpdate(
      { _id: deal._id, status: { $in: ['accepted','meeting_scheduled'] }, [fieldToUpdate]: { $ne: true } },
      { $set: { [fieldToUpdate]: true } },
      { new: true }
    ).populate('offererOffer receiverOffer');

    if (!updatedDeal) {
      return res.status(200).json({ success: true, message: 'Confirmation already processed or deal state invalid' });
    }

    if (updatedDeal.offererConfirmed && updatedDeal.receiverConfirmed) {
      const mongoose = require('mongoose');
      let session = null;
      try {
        session = await mongoose.startSession();
        session.startTransaction();
      } catch (e) {
        if (process.env.NODE_ENV === 'production') {
          console.error('CRITICAL: Transactions are required in production but failed to start. Aborting deal confirmation.', e);
          throw new Error('Database transactions are not supported by the current connection. Cannot process deal securely in production.');
        }
        console.warn('Transactions not supported (likely standalone MongoDB). Falling back to non-transactional updates.');
        session = null;
      }

      try {
        // 1. Mark deal as completed atomically
        const completedDeal = await Deal.findOneAndUpdate(
          { _id: updatedDeal._id, status: { $ne: 'completed' } },
          { $set: { status: 'completed', completedAt: new Date() } },
          { new: true, session }
        );

        if (completedDeal) {
          // 2. Update offers to 'exchanged' in a single operation
          await Offer.updateMany(
            { _id: { $in: [updatedDeal.offererOffer._id || updatedDeal.offererOffer, updatedDeal.receiverOffer._id || updatedDeal.receiverOffer] } },
            { $set: { status: 'exchanged' } },
            { session }
          );

          // 3. Update user stats
          await User.updateMany(
            { _id: { $in: [updatedDeal.offerer, updatedDeal.receiver] } },
            { $inc: { totalExchanges: 1, successfulExchanges: 1 } },
            { session }
          );
          
          if (session) await session.commitTransaction();
          if (session) session.endSession();

          // 4. Trigger recalculations async (don't block the request if this fails)
          Promise.all([
            User.findById(updatedDeal.offerer).then(u => { if (u) { u.calculateTrustScore(); u.updateBadges(); return u.save(); } }),
            User.findById(updatedDeal.receiver).then(u => { if (u) { u.calculateTrustScore(); u.updateBadges(); return u.save(); } })
          ]).catch(e => console.error('Trust score recalculation error:', e));
          
          // 5. Notifications and messages
          await Notification.insertMany([
            { user: updatedDeal.offerer, type: 'deal_completed', title: 'Deal Completed', message: 'Deal marked as completed', relatedDeal: updatedDeal._id },
            { user: updatedDeal.receiver, type: 'deal_completed', title: 'Deal Completed', message: 'Deal marked as completed', relatedDeal: updatedDeal._id }
          ]);
          
          await Message.create({ conversation: updatedDeal.conversation, sender: req.user._id, content: `Deal completed`, type: 'system', relatedOffer: updatedDeal.receiverOffer ? (updatedDeal.receiverOffer._id || updatedDeal.receiverOffer) : null, readBy: [req.user._id] });

          await logAction(req.user._id, 'COMPLETE_DEAL', { 
            targetId: updatedDeal._id, 
            targetModel: 'Deal',
            req 
          });
        }
      } catch (postError) {
        if (session) {
          await session.abortTransaction();
          session.endSession();
        }
        console.error('Error during post-deal completion tasks:', postError);
        // Throw to the main error handler so the user knows it failed
        throw postError;
      }
    }
    return res.status(200).json({ success: true, deal: updatedDeal, message: 'Confirmation processed' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function cancelDeal(req, res) {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });
    if (![deal.offerer.toString(), deal.receiver.toString()].includes(req.user._id.toString())) return res.status(403).json({ success: false, message: 'Not authorized' });
    if (deal.status === 'completed') return res.status(400).json({ success: false, message: 'Cannot cancel a completed deal' });
    if (deal.status === 'cancelled') return res.status(400).json({ success: false, message: 'Deal is already cancelled' });
    deal.status = 'cancelled';
    deal.cancelledAt = Date.now();
    deal.cancelledBy = req.user._id;
    deal.cancellationReason = (req.body || {}).reason || 'Cancelled by user';
    await deal.save();
    const other = deal.offerer.toString() === req.user._id.toString() ? deal.receiver : deal.offerer;
    await Notification.create({ user: other, type: 'deal_cancelled', title: 'Deal Cancelled', message: `Deal cancelled by ${req.user.firstName || ''}`, relatedDeal: deal._id });
    await Message.create({ conversation: deal.conversation, sender: req.user._id, content: `Deal cancelled`, type: 'system', relatedOffer: deal.receiverOffer ? (deal.receiverOffer._id || deal.receiverOffer) : null, readBy: [req.user._id] });

    // Log the cancellation
    await logAction(req.user._id, 'CANCEL_DEAL', { 
      targetId: deal._id, 
      targetModel: 'Deal',
      details: { reason: deal.cancellationReason },
      req 
    });

    return res.status(200).json({ success: true, deal });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function getMyDeals(req, res) {
  try {
    const { status } = req.query;
    const filter = { $or: [{ offerer: req.user._id }, { receiver: req.user._id }] };
    if (status) filter.status = status;
    const deals = await Deal.find(filter).sort({ updatedAt: -1 }).populate('offerer', 'firstName lastName profilePhoto').populate('receiver', 'firstName lastName profilePhoto').populate('offererOffer receiverOffer');
    return res.status(200).json({ success: true, count: deals.length, deals });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function getDeal(req, res) {
  try {
    const deal = await Deal.findById(req.params.id).populate({ path: 'offerer receiver offererOffer receiverOffer conversation' });
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });
    
    // Support both populated or unpopulated fields for safety
    const offererId = deal.offerer._id ? deal.offerer._id.toString() : deal.offerer.toString();
    const receiverId = deal.receiver._id ? deal.receiver._id.toString() : deal.receiver.toString();
    const currentUserId = req.user._id.toString();

    if (offererId !== currentUserId && receiverId !== currentUserId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    return res.status(200).json({ success: true, deal });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

module.exports = { proposeDeal, respondToDeal, acceptCounter, setMeeting, confirmExchange, cancelDeal, getMyDeals, getDeal };
