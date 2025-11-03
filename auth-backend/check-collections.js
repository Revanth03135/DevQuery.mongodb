/**
 * Check MongoDB collections using backend's MongoDB driver
 * Run from auth-backend directory
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const connectionString = process.argv[2] || 'mongodb://localhost:27017/MONGODB_test';

console.log('🔍 Checking MongoDB collections...');
console.log('📡 Connection string:', connectionString);
console.log('');

async function checkCollections() {
  let client;
  
  try {
    client = await MongoClient.connect(connectionString, {
      serverSelectionTimeoutMS: 5000
    });
    
    console.log('✅ Connected to MongoDB successfully!');
    
    const dbName = connectionString.split('/').pop().split('?')[0];
    const db = client.db(dbName);
    
    console.log('📊 Database:', dbName);
    console.log('');
    
    const collections = await db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('❌ NO COLLECTIONS FOUND!');
      console.log('');
      console.log('This is why Schema Explorer is empty.');
      console.log('');
      console.log('💡 Add sample data:');
      console.log('');
      console.log('  mongo MONGODB_test --eval "db.users.insertMany([');
      console.log('    { name: "Alice", age: 30, role: "admin" },');
      console.log('    { name: "Bob", age: 25, role: "user" }');
      console.log('  ])"');
      console.log('');
      console.log('Then refresh Schema Explorer in DevQuery!');
      console.log('');
    } else {
      console.log(`✅ Found ${collections.length} collection(s):\n`);
      
      for (const coll of collections) {
        const collName = coll.name;
        const count = await db.collection(collName).countDocuments();
        
        console.log(`   📚 ${collName}`);
        console.log(`      - Documents: ${count}`);
        
        if (count > 0) {
          const sample = await db.collection(collName).findOne({});
          const fields = Object.keys(sample || {});
          console.log(`      - Fields: ${fields.length} (${fields.slice(0, 5).join(', ')}${fields.length > 5 ? '...' : ''})`);
        }
        console.log('');
      }
      
      console.log('✅ Collections found! They should appear in Schema Explorer.');
      console.log('   If not showing, click "Refresh Schema" button.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 MongoDB is not running or not accessible');
      console.log('   - Is MongoDB running locally? Try: mongod');
      console.log('   - Or update connection string to your MongoDB server');
    }
  } finally {
    if (client) {
      await client.close();
    }
  }
}

checkCollections();
