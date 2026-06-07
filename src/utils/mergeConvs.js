const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Deal = require('../models/Deal');
const logger = require('../config/logger');

async function mergeDuplicateConversations() {
  try {
    logger.info('🔄 Auditing database for duplicate conversations...');
    const allConvs = await Conversation.find({});
    
    // Group conversations by sorted participant IDs
    const groups = {};
    for (const conv of allConvs) {
      if (!conv.participants || !Array.isArray(conv.participants) || conv.participants.length !== 2) {
        continue;
      }
      // Safely filter out null/undefined participants
      const validParticipants = conv.participants.filter(p => p !== null && p !== undefined);
      if (validParticipants.length !== 2) {
        continue;
      }
      
      const key = validParticipants.map(p => p.toString()).sort().join('_');
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(conv);
    }
    
    let totalMerged = 0;

    for (const key in groups) {
      const convList = groups[key];
      if (convList.length <= 1) {
        continue; // No duplicates for this pair
      }
      
      // Determine the primary conversation
      // Prefer type: 'contact'
      // If tie, choose the one with the most messages
      // If tie, choose the oldest one (earliest createdAt)
      
      const scoredConvs = [];
      for (const conv of convList) {
        const msgCount = await Message.countDocuments({ conversation: conv._id });
        let score = 0;
        if (conv.type === 'contact') {
          score += 1000; // Prefer contact
        }
        score += msgCount;
        scoredConvs.push({ conv, score, msgCount });
      }
      
      // Sort in descending order of score, then ascending order of createdAt
      scoredConvs.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return new Date(a.conv.createdAt) - new Date(b.conv.createdAt);
      });
      
      const primary = scoredConvs[0].conv;
      const primaryIdStr = primary._id.toString();
      logger.info(`📌 Pair [${key}]: Primary conversation is ${primaryIdStr} (type: ${primary.type})`);
      
      const activeOffersSet = new Set();
      if (primary.activeOffers && Array.isArray(primary.activeOffers)) {
        primary.activeOffers.forEach(o => {
          if (o !== null && o !== undefined) {
            activeOffersSet.add(o.toString());
          }
        });
      }
      if (primary.relatedOffer !== null && primary.relatedOffer !== undefined) {
        activeOffersSet.add(primary.relatedOffer.toString());
      }
      
      for (let i = 1; i < scoredConvs.length; i++) {
        const secondary = scoredConvs[i].conv;
        const secondaryIdStr = secondary._id.toString();
        logger.info(`  ⚠️ Merging duplicate conversation ${secondaryIdStr} into primary ${primaryIdStr}`);
        
        // 1. Move all messages from secondary to primary
        const msgResult = await Message.updateMany(
          { conversation: secondary._id },
          { $set: { conversation: primary._id } }
        );
        logger.info(`    ✅ Moved ${msgResult.modifiedCount} messages`);
        
        // 2. Collect active offers from secondary
        if (secondary.activeOffers && Array.isArray(secondary.activeOffers)) {
          secondary.activeOffers.forEach(o => {
            if (o !== null && o !== undefined) {
              activeOffersSet.add(o.toString());
            }
          });
        }
        if (secondary.relatedOffer !== null && secondary.relatedOffer !== undefined) {
          activeOffersSet.add(secondary.relatedOffer.toString());
        }
        
        // 3. Move deals associated with secondary to primary
        const dealResult = await Deal.updateMany(
          { conversation: secondary._id },
          { $set: { conversation: primary._id } }
        );
        if (dealResult.modifiedCount > 0) {
          logger.info(`    ✅ Transferred ${dealResult.modifiedCount} deals`);
        }
        
        // 4. Delete secondary conversation
        await Conversation.deleteOne({ _id: secondary._id });
        logger.info(`    🗑️ Deleted secondary conversation record`);
        
        totalMerged++;
      }
      
      // Convert activeOffers back to ObjectId array
      const currentActiveOfferIds = (primary.activeOffers && Array.isArray(primary.activeOffers))
        ? primary.activeOffers.filter(o => o !== null && o !== undefined).map(o => o.toString())
        : [];
      const newActiveOfferIds = Array.from(activeOffersSet);
      
      // Check if we need to update activeOffers in primary
      const needsUpdate = newActiveOfferIds.some(id => !currentActiveOfferIds.includes(id)) || primary.type !== 'contact';
      
      if (needsUpdate) {
        primary.activeOffers = newActiveOfferIds.map(id => new mongoose.Types.ObjectId(id));
        primary.type = 'contact'; // Ensure primary is contact type
        await primary.save();
        logger.info(`    ✨ Updated primary conversation activeOffers & set type to contact`);
      }
      
      // Re-evaluate lastMessage for the primary conversation
      const lastMsg = await Message.findOne({ conversation: primary._id }).sort({ createdAt: -1 });
      if (lastMsg) {
        primary.lastMessage = {
          content: lastMsg.content,
          sender: lastMsg.sender,
          createdAt: lastMsg.createdAt
        };
        await primary.save();
      }
    }
    
    logger.info('🔄 Auditing messages for missing relatedOffer fields...');
    let healedMsgsCount = 0;
    
    for (const conv of allConvs) {
      const msgs = await Message.find({ conversation: conv._id, relatedOffer: null });
      if (msgs.length === 0) {
        continue;
      }
      
      let defaultOffer = conv.relatedOffer;
      if (!defaultOffer && conv.activeOffers && conv.activeOffers.length > 0) {
        const validOffers = conv.activeOffers.filter(o => o !== null && o !== undefined);
        if (validOffers.length > 0) {
          defaultOffer = validOffers[0];
        }
      }
      
      for (const msg of msgs) {
        let offerToSet = null;
        
        if (msg.dealProposal) {
          try {
            const deal = await Deal.findById(msg.dealProposal);
            if (deal && deal.receiverOffer) {
              offerToSet = deal.receiverOffer;
            }
          } catch (e) {
            logger.warn(`Error resolving deal ${msg.dealProposal} for message ${msg._id}: ${e.message}`);
          }
        }
        
        if (!offerToSet) {
          offerToSet = defaultOffer;
        }
        
        if (offerToSet) {
          msg.relatedOffer = offerToSet;
          await msg.save();
          healedMsgsCount++;
        }
      }
    }
    
    if (healedMsgsCount > 0) {
      logger.info(`✨ Successfully healed ${healedMsgsCount} messages with correct relatedOffer associations.`);
    }
    
    if (totalMerged > 0) {
      logger.info(`✅ Successfully merged ${totalMerged} duplicate conversation(s)`);
    } else {
      logger.info('✅ No duplicate conversations found.');
    }
  } catch (err) {
    logger.error(`❌ Error during duplicate conversation merge: ${err.message}`);
  }
}

module.exports = { mergeDuplicateConversations };
