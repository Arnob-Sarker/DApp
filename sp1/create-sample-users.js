require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Sample users for SP1
const sampleUsers = [
  {
    name: 'Ahmed Khan',
    email: 'ahmed@sp1.com',
    password: 'password123'
  },
  {
    name: 'Fatima Rahman',
    email: 'fatima@sp1.com',
    password: 'password123'
  },
  {
    name: 'Mohammed Ali',
    email: 'mohammed@sp1.com',
    password: 'password123'
  }
];

async function createSampleUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Create sample users
    for (const userData of sampleUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = new User({
          name: userData.name,
          email: userData.email,
          password: hashedPassword
        });
        
        await user.save();
        console.log(`✅ Created user: ${userData.name} (${userData.email})`);
      } else {
        console.log(`⚠️  User already exists: ${userData.email}`);
      }
    }

    console.log('\n🎉 Sample users created successfully!');
    console.log('\n📋 Login Credentials for SP1:');
    console.log('Email: ahmed@sp1.com, Password: password123');
    console.log('Email: fatima@sp1.com, Password: password123');
    console.log('Email: mohammed@sp1.com, Password: password123');

  } catch (error) {
    console.error('Error creating sample users:', error);
  } finally {
    mongoose.connection.close();
  }
}

createSampleUsers(); 