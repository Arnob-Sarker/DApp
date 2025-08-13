const mongoose = require('mongoose');
require('dotenv').config();

async function clearDatabase() {
    try {
        // Connect to MongoDB
        const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/registration_db';
        await mongoose.connect(mongoUrl);
        console.log('Connected to MongoDB');

        // Clear all collections
        const collections = await mongoose.connection.db.collections();
        
        for (let collection of collections) {
            await collection.deleteMany({});
            console.log(`Cleared collection: ${collection.collectionName}`);
        }

        console.log('Database cleared successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error clearing database:', error);
        process.exit(1);
    }
}

clearDatabase(); 