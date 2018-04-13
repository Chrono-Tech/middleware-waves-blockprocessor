/** 
 * Mongoose model. Represents a block in eth
 * @module models/blockModel
 * @returns {Object} Mongoose model
 */

const mongoose = require('mongoose'),
  config = require('../config');

const Block = new mongoose.Schema({
  version: {type: String},  
  number: {type: Number, unique: true, index: true},  
  hash: {type: String, unique: true, index: true}, //signature in block waves
  prevBlockHash: {type: String}, //reference in block waves  
  timestamp: {type: Date, index: true, required: true},

  generator: {type: String},
  'nxt-consensus': {
    'base-target': {type: Number},
    'generation-signature': {type: String}
  },
  blocksize: {type: String},
  fee: {type: String},  

  transactions: [{
    hash: {type:String, index: true}, //id in block waves
    signature: {type: String},    
    'type': {type: String},
    timestamp: {type: Date},    

    assetId: {type: String, index: true}, //id of asset
    feeAsset: {type: String}, //fee in asset

    attachment: {type: String},

    sender: {type: String, index: true},
    senderPublicKey: {type: String},
    recipient: {type: String, index: true},
    fee: {type: String},
    amount: {type: Number},    

    transfers: [{
      recipient: { type: String, index: true},
      amount: {type: Number}
    }]

  }],
  transactionCount: {type: String},


  network: {type: String},
  created: {type: Date, required: true, default: Date.now}
});

module.exports = mongoose.model(`${config.mongo.data.collectionPrefix}Block`, Block);
