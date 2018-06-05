/**
 * Mongoose model. Represents a transaction in waves
 * @module models/txModel
 * @returns {Object} Mongoose model
 * 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Vesrsion 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
*/

const mongoose = require('mongoose'),
  config = require('../config');

const TX = new mongoose.Schema({
  blockNumber: {type: Number, required: true, index: true, default: -1},
  timestamp: {type: Number, required: true, index: true, default: Date.now},  
  
  amount: {type: Number}, 
  hash: {type: String, index: true, unique: true}, //signature in block waves

  id: {type: String},
  signature: {type: String},    
  'type': {type: String},

  recipient: {type: String, index: true},
  sender: {type: String, index: true},

  assetId: {type: String, index: true}, //id of asset
  feeAsset: {type: String}, //fee in asset

  attachment: {type: String},
  senderPublicKey: {type: String},
  fee: {type: String},

  transfers: [{
    recipient: { type: String, index: true},
    amount: {type: Number}
  }]
});

module.exports = mongoose.model(`${config.mongo.data.collectionPrefix}TX`, TX);
