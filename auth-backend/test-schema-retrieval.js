// test-schema-retrieval.js
// Quick test script to verify schema is being retrieved correctly

const DatabaseConnectionManager = require('./src/utils/DatabaseConnectionManager');
const logger = require('./src/utils/logger');

async function testSchema() {
  const dbManager = new DatabaseConnectionManager();
  
  console.log('\n=== TESTING SCHEMA RETRIEVAL ===\n');
  
  // You would need to have an active connection for this to work
  // In production, get this from your test database
  
  // Example: Connect to MySQL
  try {
    console.log('1. Testing MySQL Connection...');
    const connectionId = await dbManager.connect({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'your_password',
      database: 'your_database'
    });
    
    console.log(`✓ Connected with ID: ${connectionId}\n`);
    
    console.log('2. Retrieving Schema...');
    const schemaResult = await dbManager.getSchema(connectionId);
    
    console.log(`✓ Schema Retrieved:`);
    console.log(`  - Success: ${schemaResult.success}`);
    console.log(`  - Tables: ${schemaResult.schema.length}`);
    
    if (schemaResult.schema.length > 0) {
      console.log(`  - First table: ${schemaResult.schema[0].table_name}`);
      console.log(`  - Columns: ${schemaResult.schema[0].columns.length}`);
      
      console.log('\n3. Schema Format:');
      console.log(JSON.stringify(schemaResult.schema[0], null, 2));
      
      // Test column type query
      const tableName = schemaResult.schema[0].table_name;
      const columnName = schemaResult.schema[0].columns[0].name;
      
      console.log(`\n4. Testing Column Type Query:`);
      const colType = await dbManager.getColumnType(connectionId, tableName, columnName);
      console.log(`  Column: ${tableName}.${columnName}`);
      console.log(`  Type: ${colType.data.type}`);
      console.log(`  Nullable: ${colType.data.nullable}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSchema();
