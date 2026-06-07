const mongoose = require('mongoose');

async function connectDB() {
  const options = {
    serverSelectionTimeoutMS: 30000, 
    socketTimeoutMS: 45000, 
    bufferCommands: true,
    maxPoolSize: 10, // Increase pool size for concurrent requests
    minPoolSize: 2,
    heartbeatFrequencyMS: 10000, // Check connection every 10s
  };

  // Connection Event Listeners
  mongoose.connection.on('connected', () => console.log('✅ MongoDB: Connected successfully'));
  mongoose.connection.on('error', (err) => console.log(`❌ MongoDB: Error occurred: ${err.message}`));
  mongoose.connection.on('disconnected', () => console.log('⚠️ MongoDB: Disconnected! Attempting to reconnect...'));
  mongoose.connection.on('reconnected', () => console.log('♻️ MongoDB: Reconnected successfully'));

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Initial Connection Error: ${error.message}`);
    // Special retry logic for initial connection if it fails
    setTimeout(connectDB, 5000); 
  }
}

module.exports = connectDB;
