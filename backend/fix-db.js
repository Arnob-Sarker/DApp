const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const db = mongoose.connection.db;
    const users = db.collection('users');
    try {
      // Drop unique indexes if they exist
      try { await users.dropIndex('walletAddress_1'); console.log('Dropped index: walletAddress_1'); } catch (e) { if (!e.message.includes('index not found')) console.log(e.message); }
      try { await users.dropIndex('walletAddr_1'); console.log('Dropped index: walletAddr_1'); } catch (e) { if (!e.message.includes('index not found')) console.log(e.message); }
      try { await users.dropIndex('email_1'); console.log('Dropped index: email_1'); } catch (e) { if (!e.message.includes('index not found')) console.log(e.message); }
      // Delete users with null wallet addresses
      const delRes = await users.deleteMany({ $or: [ { walletAddress: null }, { walletAddr: null } ] });
      console.log('Deleted users with null wallet address:', delRes.deletedCount);
      // Show current indexes
      const indexes = await users.indexes();
      console.log('Current indexes:', indexes);
    } catch (err) {
      console.error('Error during cleanup:', err);
    }
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
  }); 