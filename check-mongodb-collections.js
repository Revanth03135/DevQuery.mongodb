/**
 * Check if MongoDB has any collections
 * Run: node check-mongodb-collections.js
 */

const { MongoClient } = require('mongodb');

// Default connection string - update if yours is different
const connectionString = process.argv[2] || 'mongodb://localhost:27017/MONGODB_test';

console.log('🔍 Checking MongoDB collections...');
console.log('📡 Connection string:', connectionString);
console.log('');

async function checkCollections() {
  let client;
  
  try {
    // Connect to MongoDB
    client = await MongoClient.connect(connectionString, {
      serverSelectionTimeoutMS: 5000
    });
    
    console.log('✅ Connected to MongoDB successfully!');
    
    // Get database name from connection string
    const dbName = connectionString.split('/').pop().split('?')[0];
    const db = client.db(dbName);
    
    console.log('📊 Database:', dbName);
    console.log('');
    
    // List all collections
    const collections = await db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('❌ No collections found in database!');
      console.log('');
      console.log('💡 Solution: Add some data to your MongoDB database');
      console.log('');
      console.log('Example:');
      console.log('  mongo MONGODB_test');
      console.log('  db.users.insertOne({ name: "Test User", email: "test@example.com" })');
      console.log('  db.products.insertOne({ name: "Test Product", price: 99.99 })');
      console.log('');
    } else {
      console.log(`✅ Found ${collections.length} collection(s):\n`);
      
      for (const coll of collections) {
        const collName = coll.name;
        const count = await db.collection(collName).countDocuments();
        
        console.log(`   📚 ${collName}`);
        console.log(`      - Documents: ${count}`);
        
        if (count > 0) {
          // Get sample document
          const sample = await db.collection(collName).findOne({});
          const fields = Object.keys(sample || {});
          console.log(`      - Fields: ${fields.length} (${fields.slice(0, 5).join(', ')}${fields.length > 5 ? '...' : ''})`);
        }
        console.log('');
      }
      
      console.log('🎉 Your MongoDB database has data!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Refresh your browser (Ctrl + Shift + R)');
      console.log('2. Click "Refresh Schema" in DevQuery');
      console.log('3. Collections should appear in Schema Explorer');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 MongoDB is not running!');
      console.log('   Start it with: mongod');
    } else if (error.message.includes('Authentication failed')) {
      console.log('\n💡 Authentication failed!');
      console.log('   Check your username and password in the connection string');
    } else if (error.message.includes('getaddrinfo ENOTFOUND')) {
      console.log('\n💡 Cannot connect to MongoDB server!');
      console.log('   Check the hostname in your connection string');
    }
    
    console.log('\nConnection string format:');
    console.log('  mongodb://localhost:27017/database_name');
    console.log('  mongodb://username:password@host:port/database_name');
    
  } finally {
    if (client) {
      await client.close();
    }
  }
}

checkCollections();
