const mongoose = require('mongoose');
const uri = 'mongodb+srv://firassfaxi97_db_user:Four123.@badel.agsyboy.mongodb.net/badel?retryWrites=true&w=majority';
mongoose.connect(uri).then(async () => {
  const Deal = require('./src/models/Deal');
  const myId = '69ff87c4b95ac9c11f61e8e9'; // user id we got earlier
  const activeStatuses = ['proposed', 'counter_offered', 'accepted', 'meeting_scheduled'];
  const deals = await Deal.find({ $or: [{ offerer: myId }, { receiver: myId }] });
  
  const extractId = (f) => f ? f.toString() : '';
  const recus = deals.filter(d => extractId(d.receiver) === myId && activeStatuses.includes(d.status));
  const envoyes = deals.filter(d => extractId(d.offerer) === myId && activeStatuses.includes(d.status));
  
  console.log('Recus deals:', recus.length);
  console.log('Envoyes deals:', envoyes.length);
  console.log('Recus deal details:', JSON.stringify(recus.map(d => ({id: d._id, status: d.status, receiver: d.receiver, offerer: d.offerer})), null, 2));
  process.exit(0);
}).catch(console.error);
