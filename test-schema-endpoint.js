/**
 * Test Script to Verify MongoDB Schema Endpoint
 * Run: node test-schema-endpoint.js
 */

const http = require('http');

// Test health endpoint first
console.log('🔍 Testing Backend Health...\n');

const healthOptions = {
  hostname: 'localhost',
  port: 5000,
  path: '/health',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const healthReq = http.request(healthOptions, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('✅ Backend Health Check:');
    console.log(JSON.stringify(JSON.parse(data), null, 2));
    console.log('\n---\n');
    
    // Instructions for user
    console.log('📋 Next Steps to See MongoDB Collections:\n');
    console.log('1. Open http://localhost:5173 in your browser');
    console.log('2. Click "Add Connection" button');
    console.log('3. Select "🍃 MongoDB" from database type dropdown');
    console.log('4. Enter your MongoDB connection string:');
    console.log('   Example: mongodb://localhost:27017/your_database_name');
    console.log('   OR: mongodb://username:password@host:port/database');
    console.log('5. Click "Connect"');
    console.log('6. Schema Explorer will automatically show your collections\n');
    
    console.log('💡 Troubleshooting:');
    console.log('- Make sure MongoDB is running: mongod');
    console.log('- Verify your database has data');
    console.log('- Check browser console (F12) for errors');
    console.log('- Look for green "MONGODB" badge after connecting\n');
    
    console.log('🎨 What to Expect:');
    console.log('- "Collections" button instead of "Tables"');
    console.log('- Green MongoDB badge (🍃)');
    console.log('- Collection names with field counts');
    console.log('- Click any collection to see its fields\n');
  });
});

healthReq.on('error', (error) => {
  console.error('❌ Backend not responding:', error.message);
  console.log('\n💡 Start backend: cd auth-backend && npm start\n');
});

healthReq.end();
