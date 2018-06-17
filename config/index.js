/**
 * Chronobank/eth-blockprocessor configuration
 * @module config
 * @returns {Object} Configuration
 * 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const _ = require('lodash');
require('dotenv').config();

const config = {
  mongo: {
    accounts: {
      uri: process.env.MONGO_ACCOUNTS_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/data',
      collectionPrefix: process.env.MONGO_ACCOUNTS_COLLECTION_PREFIX || process.env.MONGO_COLLECTION_PREFIX || 'waves'
    },
    data: {
      uri: process.env.MONGO_DATA_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/data',
      collectionPrefix: process.env.MONGO_DATA_COLLECTION_PREFIX || process.env.MONGO_COLLECTION_PREFIX || 'waves'
    }
  },
  rabbit: {
    url: process.env.RABBIT_URI || 'amqp://localhost:5672',
    serviceName: process.env.RABBIT_SERVICE_NAME || 'app_waves'
  },
  sync: {
    shadow: parseInt(process.env.SYNC_SHADOW) || true
  },
  node: {
    providers: _.chain(process.env.PROVIDERS || 'http://localhost:6869@')
      .split(',')
      .map(provider => {
        const data = provider.split('@');
        return {
          http: data[0].trim(),
          ws: ''
        };
      })
      .value(),
    network: process.env.NETWORK || 'testnet',
    blockGenerationTime: process.env.BLOCK_GENERATION_TIME || 60
  }
};

module.exports = config;
