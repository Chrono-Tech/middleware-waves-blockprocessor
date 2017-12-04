/**
 * Chronobank/eth-blockprocessor configuration
 * @module config
 * @returns {Object} Configuration
 */

require('dotenv').config();

const config = {
  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/data'
  },
  rabbit: {
    url: process.env.RABBIT_URI || 'amqp://localhost:5672',
    serviceName: process.env.RABBIT_SERVICE_NAME || 'app_waves'
  },
  waves: {
    rpc: process.env.RPC || 'http://localhost:6869',
    network: process.env.NETWORK || 'testnet'
  }
};

module.exports = config;
