const mongoose = require('mongoose');

const uri = process.env.MONGO_URI || 'mongodb+srv://<user>:<password>@<cluster>.mongodb.net/test';

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const db = mongoose.connection.db;
    const users = db.collection('users');
    try {
      // Drop unique index if it exists
      try { await users.dropIndex('walletAddress_1'); console.log('Dropped index: walletAddress_1'); } catch (e) { if (!e.message.includes('index not found')) console.log(e.message); }
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