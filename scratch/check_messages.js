const mongoose = require('mongoose');

async function run() {
  try {
    await mongoose.connect('mongodb+srv://firassfaxi97_db_user:Four123.@badel.agsyboy.mongodb.net/badel?retryWrites=true&w=majority');
    console.log('Connected');
    
    const Message = require('../src/models/Message');
    const Deal = require('../src/models/Deal');
    const Conversation = require('../src/models/Conversation');
    
    const convId = '6a11879b210c4e5418ed8375';
    const msgs = await Message.find({ conversation: convId }).sort({ createdAt: 1 });
    console.log(`Found ${msgs.length} messages in conversation ${convId}:`);
    
    for (const msg of msgs) {
      console.log(`- MSG ID: ${msg._id} | Sender: ${msg.sender} | Type: ${msg.type} | Content: "${msg.content}" | relatedOffer: ${msg.relatedOffer} | dealProposal: ${msg.dealProposal}`);
    }
    
    const deals = await Deal.find({ conversation: convId });
    console.log(`\nFound ${deals.length} deals in conversation ${convId}:`);
    for (const d of deals) {
      console.log(`- Deal ID: ${d._id} | OffererOffer: ${d.offererOffer} | ReceiverOffer: ${d.receiverOffer} | Status: ${d.status}`);
    }
    
    const conv = await Conversation.findById(convId);
    console.log(`\nConversation Details:`);
    console.log(`- Type: ${conv.type} | relatedOffer: ${conv.relatedOffer} | activeOffers: ${JSON.stringify(conv.activeOffers)}`);
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
