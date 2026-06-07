const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://firassfaxi97_db_user:Four123.@badel.agsyboy.mongodb.net/badel?retryWrites=true&w=majority').then(async () => {
  require('./src/models/User');
  require('./src/models/Offer');
  require('./src/models/Deal');
  const Conversation = require('./src/models/Conversation');
  const Message = require('./src/models/Message');
  
  const uid = new mongoose.Types.ObjectId('69f360eca2d319e578a69253'); // firasdoubel
  const convs = await Conversation.find({ participants: uid })
    .sort({ updatedAt: -1 })
    .populate('participants', 'firstName lastName profilePhoto trustScore isActive')
    .populate('relatedOffer', 'title photos status')
    .populate('relatedDeal', 'status');
    
  const result = [];
  for (const c of convs) {
    const unread = await Message.countDocuments({ conversation: c._id, readBy: { $ne: uid } });
    const lastMsg = await Message.findOne({ conversation: c._id }).sort({ createdAt: -1 }).select('content createdAt type sender');
    const obj = c.toObject();
    obj.unreadCount = unread;
    obj.lastMessage = lastMsg ? lastMsg.toObject() : null;
    result.push(obj);
  }
  
  console.log('RESPONSE count:', result.length);
  result.forEach(c => {
    const parts = c.participants.map(p => p ? (p.firstName + ' ' + p._id) : 'NULL');
    const last = c.lastMessage ? (c.lastMessage.content || c.lastMessage.type) : 'none';
    console.log('CONV', String(c._id), '| participants:', JSON.stringify(parts), '| unread:', c.unreadCount, '| last:', last);
  });
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
