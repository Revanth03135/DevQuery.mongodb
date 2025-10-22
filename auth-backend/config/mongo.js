const mongoose = require('mongoose');
const logger = require('../src/utils/logger');

const connectMongo = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/devquery';
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      autoIndex: true,
      maxPoolSize: parseInt(process.env.MONGO_POOL_SIZE, 10) || 10,
      ...(process.env.MONGO_DB_NAME ? { dbName: process.env.MONGO_DB_NAME } : {})
    });
    logger.info(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    throw error;
  }
};

module.exports = connectMongo;
