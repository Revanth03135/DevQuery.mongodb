/**
 * MongoDB Integration Test Script
 * 
 * This script tests MongoDB functionality with the DevQuery backend.
 * Run with: node test-mongodb-integration.js
 * 
 * Prerequisites:
 * - MongoDB running locally or accessible via connection string
 * - Backend server running
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000/api';
const MONGODB_CONFIG = {
  // Option 1: Connection string
  connectionString: 'mongodb://localhost:27017/testdb',
  
  // Option 2: Individual parameters (comment out if using connection string)
  // host: 'localhost',
  // port: 27017,
  // database: 'testdb',
  // username: 'your_username',  // optional
  // password: 'your_password'   // optional
};

let connectionId = null;

// Helper function for API calls
async function apiCall(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// Test functions
async function test1_Connect() {
  console.log('\n📌 Test 1: Connect to MongoDB');
  console.log('=' .repeat(50));
  
  const result = await apiCall('POST', '/database/connect', MONGODB_CONFIG);
  
  if (result.success && result.data.connectionId) {
    connectionId = result.data.connectionId;
    console.log('✅ Connected successfully!');
    console.log(`   Connection ID: ${connectionId}`);
    console.log(`   Database: ${result.data.database}`);
    console.log(`   Type: ${result.data.dbType}`);
  } else {
    console.log('❌ Connection failed!');
    console.log(`   Error: ${JSON.stringify(result.error, null, 2)}`);
    throw new Error('Cannot proceed without connection');
  }
}

async function test2_GetSchema() {
  console.log('\n📌 Test 2: Retrieve Schema');
  console.log('=' .repeat(50));
  
  const result = await apiCall('GET', `/database/schema?connectionId=${connectionId}`);
  
  if (result.success && result.data.schema) {
    console.log('✅ Schema retrieved successfully!');
    console.log(`   Collections found: ${result.data.schema.length}`);
    
    result.data.schema.slice(0, 3).forEach(coll => {
      console.log(`\n   Collection: ${coll.table_name}`);
      console.log(`   Fields: ${coll.columns?.length || 0}`);
      
      if (coll.columns) {
        coll.columns.slice(0, 5).forEach(col => {
          console.log(`      - ${col.name} (${col.data_type})`);
        });
        
        if (coll.columns.length > 5) {
          console.log(`      ... and ${coll.columns.length - 5} more fields`);
        }
      }
    });
    
    if (result.data.schema.length > 3) {
      console.log(`\n   ... and ${result.data.schema.length - 3} more collections`);
    }
  } else {
    console.log('❌ Schema retrieval failed!');
    console.log(`   Error: ${JSON.stringify(result.error, null, 2)}`);
  }
}

async function test3_SimpleFind() {
  console.log('\n📌 Test 3: Execute Simple Find Query');
  console.log('=' .repeat(50));
  
  // Try to find the first collection from schema
  const schemaResult = await apiCall('GET', `/database/schema?connectionId=${connectionId}`);
  const firstCollection = schemaResult.data?.schema?.[0]?.table_name;
  
  if (!firstCollection) {
    console.log('⚠️  No collections found, skipping test');
    return;
  }
  
  const query = `db.${firstCollection}.find({}).limit(5)`;
  console.log(`   Query: ${query}`);
  
  const result = await apiCall('POST', '/database/query', {
    connectionId,
    query
  });
  
  if (result.success) {
    console.log('✅ Query executed successfully!');
    console.log(`   Documents returned: ${result.data.data?.rowCount || 0}`);
    console.log(`   Execution time: ${result.data.executionTime}ms`);
    
    if (result.data.data?.rows?.length > 0) {
      console.log('\n   Sample document:');
      console.log(JSON.stringify(result.data.data.rows[0], null, 2).split('\n').map(line => '   ' + line).join('\n'));
    }
  } else {
    console.log('❌ Query execution failed!');
    console.log(`   Error: ${JSON.stringify(result.error, null, 2)}`);
  }
}

async function test4_Aggregation() {
  console.log('\n📌 Test 4: Execute Aggregation Pipeline');
  console.log('=' .repeat(50));
  
  const schemaResult = await apiCall('GET', `/database/schema?connectionId=${connectionId}`);
  const firstCollection = schemaResult.data?.schema?.[0]?.table_name;
  
  if (!firstCollection) {
    console.log('⚠️  No collections found, skipping test');
    return;
  }
  
  // Try to find a field to group by
  const firstField = schemaResult.data.schema[0].columns?.[1]?.name || 'status';
  
  const query = `db.${firstCollection}.aggregate([
    { $group: { _id: "$${firstField}", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ])`;
  
  console.log(`   Query: ${query.replace(/\n\s+/g, ' ')}`);
  
  const result = await apiCall('POST', '/database/query', {
    connectionId,
    query
  });
  
  if (result.success) {
    console.log('✅ Aggregation executed successfully!');
    console.log(`   Results: ${result.data.data?.rowCount || 0}`);
    console.log(`   Execution time: ${result.data.executionTime}ms`);
    
    if (result.data.data?.rows?.length > 0) {
      console.log('\n   Results:');
      result.data.data.rows.forEach(row => {
        console.log(`      ${row._id}: ${row.count}`);
      });
    }
  } else {
    console.log('❌ Aggregation execution failed!');
    console.log(`   Error: ${JSON.stringify(result.error, null, 2)}`);
  }
}

async function test5_AnalyticsAI() {
  console.log('\n📌 Test 5: Analytics with AI Query Generation');
  console.log('=' .repeat(50));
  
  const queries = [
    'show top 10 items',
    'count all documents',
    'group by first field'
  ];
  
  for (const queryText of queries) {
    console.log(`\n   Query: "${queryText}"`);
    
    const result = await apiCall('POST', '/analytics/query', {
      connectionId,
      query: queryText
    });
    
    if (result.success) {
      console.log('   ✅ AI generated and executed query');
      console.log(`      Generated: ${result.data.sql?.substring(0, 80)}...`);
      console.log(`      Chart type: ${result.data.chart?.chartType || 'N/A'}`);
      console.log(`      Data points: ${result.data.chart?.labels?.length || 0}`);
    } else {
      console.log('   ❌ Failed');
      console.log(`      Error: ${result.error?.message || 'Unknown'}`);
    }
  }
}

async function test6_JSONQuery() {
  console.log('\n📌 Test 6: Execute JSON-Format Query');
  console.log('=' .repeat(50));
  
  const schemaResult = await apiCall('GET', `/database/schema?connectionId=${connectionId}`);
  const firstCollection = schemaResult.data?.schema?.[0]?.table_name;
  
  if (!firstCollection) {
    console.log('⚠️  No collections found, skipping test');
    return;
  }
  
  const jsonQuery = JSON.stringify({
    collection: firstCollection,
    operation: 'find',
    query: {},
    options: { limit: 3 }
  });
  
  console.log(`   Query: ${jsonQuery}`);
  
  const result = await apiCall('POST', '/database/query', {
    connectionId,
    query: jsonQuery
  });
  
  if (result.success) {
    console.log('✅ JSON query executed successfully!');
    console.log(`   Documents returned: ${result.data.data?.rowCount || 0}`);
  } else {
    console.log('❌ JSON query failed!');
    console.log(`   Error: ${JSON.stringify(result.error, null, 2)}`);
  }
}

async function test7_Count() {
  console.log('\n📌 Test 7: Count Documents');
  console.log('=' .repeat(50));
  
  const schemaResult = await apiCall('GET', `/database/schema?connectionId=${connectionId}`);
  const firstCollection = schemaResult.data?.schema?.[0]?.table_name;
  
  if (!firstCollection) {
    console.log('⚠️  No collections found, skipping test');
    return;
  }
  
  const query = `db.${firstCollection}.count({})`;
  console.log(`   Query: ${query}`);
  
  const result = await apiCall('POST', '/database/query', {
    connectionId,
    query
  });
  
  if (result.success) {
    console.log('✅ Count executed successfully!');
    const count = result.data.data?.rows?.[0]?.count;
    console.log(`   Total documents: ${count || 'N/A'}`);
  } else {
    console.log('❌ Count failed!');
    console.log(`   Error: ${JSON.stringify(result.error, null, 2)}`);
  }
}

// Main test runner
async function runAllTests() {
  console.log('\n');
  console.log('╔' + '═'.repeat(58) + '╗');
  console.log('║' + ' '.repeat(10) + 'MongoDB Integration Test Suite' + ' '.repeat(18) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');
  
  try {
    await test1_Connect();
    await test2_GetSchema();
    await test3_SimpleFind();
    await test4_Aggregation();
    await test5_AnalyticsAI();
    await test6_JSONQuery();
    await test7_Count();
    
    console.log('\n');
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║' + ' '.repeat(15) + 'All Tests Completed! ✅' + ' '.repeat(20) + '║');
    console.log('╚' + '═'.repeat(58) + '╝');
    console.log('\n');
  } catch (error) {
    console.log('\n');
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║' + ' '.repeat(15) + 'Tests Failed ❌' + ' '.repeat(25) + '║');
    console.log('╚' + '═'.repeat(58) + '╝');
    console.error('\n❌ Error:', error.message);
    console.log('\n');
  }
}

// Run tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests };
