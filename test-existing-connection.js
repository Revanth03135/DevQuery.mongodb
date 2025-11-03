/**
 * Test if existing connection can fetch schema
 */

const http = require('http');

// The connection ID from your error message
const connectionId = '69082da7e8e5ea28827df9ff_99914b932bd37a50b983c5e7c90ae93b';

console.log('🔍 Testing Schema Endpoint for Connection:', connectionId);
console.log('');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: `/api/database/connections/${connectionId}/schema`,
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Origin': 'http://localhost:5173'
  }
};

const req = http.request(options, (res) => {
  console.log('✅ Response Status:', res.statusCode);
  console.log('📋 Response Headers:');
  console.log('   Access-Control-Allow-Origin:', res.headers['access-control-allow-origin']);
  console.log('   Content-Type:', res.headers['content-type']);
  console.log('');

  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('📊 Schema Data:');
      
      if (result.success) {
        console.log('   ✅ Success!');
        console.log('   Collections/Tables found:', result.data?.length || 0);
        
        if (result.data && result.data.length > 0) {
          console.log('\n   Collections:');
          result.data.forEach((table, idx) => {
            const name = table.table_name || table.name;
            const cols = table.columns?.length || 0;
            console.log(`   ${idx + 1}. ${name} (${cols} fields)`);
          });
        }
      } else {
        console.log('   ❌ Error:', result.message);
      }
      
      console.log('\n📄 Full Response:');
      console.log(JSON.stringify(result, null, 2));
      
    } catch (error) {
      console.log('❌ Failed to parse response:', error.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  
  if (error.code === 'ECONNREFUSED') {
    console.log('\n💡 Backend not running. Start it with:');
    console.log('   cd auth-backend && npm start');
  }
});

req.end();
