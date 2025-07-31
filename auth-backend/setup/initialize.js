const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const setupDatabase = async () => {
  console.log('🚀 Setting up DevQuery Database...\n');

  // Database connection configuration
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: 'postgres' // Connect to default postgres database first
  };

  let pool = new Pool(config);

  try {
    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'devquery_users';
    
    console.log('📊 Creating database...');
    await pool.query(`CREATE DATABASE ${dbName}`);
    console.log(`✅ Database "${dbName}" created successfully`);
  } catch (error) {
    if (error.code === '42P04') {
      console.log('📊 Database already exists, continuing...');
    } else {
      console.error('❌ Error creating database:', error.message);
    }
  }

  // Close connection to postgres database
  await pool.end();

  // Connect to our new database
  config.database = process.env.DB_NAME || 'devquery_users';
  pool = new Pool(config);

  try {
    console.log('\n📋 Creating tables...');

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        subscription_tier VARCHAR(20) DEFAULT 'free',
        subscription_expires_at TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT true,
        failed_login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created');

    // Create user_sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        refresh_token VARCHAR(500),
        ip_address INET,
        user_agent TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ User sessions table created');

    // Create database_connections table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS database_connections (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        session_id VARCHAR(255) REFERENCES user_sessions(id) ON DELETE CASCADE,
        connection_name VARCHAR(100) NOT NULL,
        database_type VARCHAR(50) NOT NULL,
        host VARCHAR(255),
        port INTEGER,
        database_name VARCHAR(100),
        username VARCHAR(100),
        connection_string TEXT,
        is_active BOOLEAN DEFAULT true,
        last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      )
    `);
    console.log('✅ Database connections table created');

    // Create user_activity table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_activity (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ User activity table created');

    // Create query_history table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS query_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        connection_id VARCHAR(255) REFERENCES database_connections(id) ON DELETE CASCADE,
        query_text TEXT NOT NULL,
        execution_time INTEGER,
        success BOOLEAN DEFAULT true,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Query history table created');

    console.log('\n🔐 Creating admin user...');

    // Create admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@devquery.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    await pool.query(`
      INSERT INTO users (username, email, password_hash, role, subscription_tier, subscription_expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        updated_at = CURRENT_TIMESTAMP
    `, ['admin', adminEmail, hashedPassword, 'admin', 'enterprise', null]);

    console.log('✅ Admin user created/updated');
    console.log(`   📧 Email: ${adminEmail}`);
    console.log(`   🔑 Password: ${adminPassword}`);

    console.log('\n📊 Creating indexes for performance...');

    // Create indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_database_connections_user_id ON database_connections(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_database_connections_session_id ON database_connections(session_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_query_history_user_id ON query_history(user_id)`);

    console.log('✅ Indexes created');

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   • Database: devquery_users');
    console.log('   • Tables: 5 (users, user_sessions, database_connections, user_activity, query_history)');
    console.log('   • Indexes: 8');
    console.log('   • Admin user: Created');
    console.log('\n🚀 You can now start the server with: npm run dev');

  } catch (error) {
    console.error('❌ Error setting up database:', error);
  } finally {
    await pool.end();
  }
};

// Check database connection
const testConnection = async () => {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: 'postgres'
  };

  const pool = new Pool(config);

  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    await pool.end();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\n📋 Please ensure PostgreSQL is running and the credentials are correct:');
    console.log(`   Host: ${config.host}`);
    console.log(`   Port: ${config.port}`);
    console.log(`   User: ${config.user}`);
    console.log('\n💡 Update your .env file with the correct database credentials');
    await pool.end();
    return false;
  }
};

// Main setup function
const main = async () => {
  console.log('🔍 Testing database connection...\n');
  
  const connected = await testConnection();
  if (!connected) {
    process.exit(1);
  }

  await setupDatabase();
};

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { setupDatabase, testConnection };
