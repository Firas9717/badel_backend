const mongoose = require('mongoose');

async function run() {
  try {
    await mongoose.connect('mongodb+srv://firassfaxi97_db_user:Four123.@badel.agsyboy.mongodb.net/badel?retryWrites=true&w=majority');
    const Conversation = require('../src/models/Conversation');
    const User = require('../src/models/User');
    const Offer = require('../src/models/Offer');
    const Message = require('../src/models/Message');
    
    const convs = await Conversation.find({}).populate('participants', 'firstName lastName');
    for (const c of convs) {
      const pNames = c.participants.map(p => p ? (p.firstName + ' ' + p.lastName) : 'NULL');
      const activeOffers = [];
      for (const offId of c.activeOffers) {
        const off = await Offer.findById(offId);
        activeOffers.push(off ? off.title : 'Unknown');
      }
      const msgCount = await Message.countDocuments({ conversation: c._id });
      console.log(`Conv ${c._id} | Parts: ${JSON.stringify(pNames)} | ActiveOffers: ${JSON.stringify(activeOffers)} | MsgCount: ${msgCount}`);
    }
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
