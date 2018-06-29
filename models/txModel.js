/**
 * Mongoose model. Represents a transaction in waves
 * @module models/txModel
 * @returns {Object} Mongoose model
 *
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */

const mongoose = require('mongoose'),
  config = require('../config');

require('mongoose-long')(mongoose);

const TX = new mongoose.Schema({
  _id: {type: String},
  signature: {type: String},
  blockNumber: {type: Number, required: true, index: true, default: -1},
  timestamp: {type: Number, required: true, index: true, default: Date.now},
  amount: {type: mongoose.Schema.Types.Long},
  quantity: {type: mongoose.Schema.Types.Long},
  decimals: {type: Number},
  type: {type: Number},
  recipient: {type: String, index: true},
  sender: {type: String, index: true},
  assetId: {type: String, index: true},
  description: {type: String},
  feeAsset: {type: String},
  attachment: {type: String},
  alias: {type: String},
  transferCount: {type: Number},
  totalAmount: {type: mongoose.Schema.Types.Long},
  script: {type: String},
  fee: {type: mongoose.Schema.Types.Long},
  minSponsoredAssetFee: {type: mongoose.Schema.Types.Long},
  order1: {
    sender: {type: String, index: true},
    assetPair: {
      amountAsset: {type: String},
      priceAsset: {type: Number}
    },
    orderType: {type: String},
    price: {type: mongoose.Schema.Types.Long},
    amount: {type: mongoose.Schema.Types.Long},
    timestamp: {type: Number},
    expiration: {type: Number},
    matcherFee: {type: mongoose.Schema.Types.Long},
    signature: {type: String}
  },
  order2: {
    sender: {type: String, index: true},
    assetPair: {
      amountAsset: {type: String},
      priceAsset: {type: Number}
    },
    orderType: {type: String},
    price: {type: mongoose.Schema.Types.Long},
    amount: {type: mongoose.Schema.Types.Long},
    timestamp: {type: Number},
    expiration: {type: Number},
    matcherFee: {type: mongoose.Schema.Types.Long},
    signature: {type: String}
  },
  transfers: [{
    recipient: {type: String, index: true},
    amount: {type: Number}
  }],
  lease: {
    type: {type: Number},
    sender: {type: String, index: true},
    fee: {type: mongoose.Schema.Types.Long},
    timestamp: {type: Number},
    signature: {type: String},
    amount: {type: mongoose.Schema.Types.Long},
    recipient: {type: String, index: true}
  },
  data: [{
    key: {type: String},
    type: {type: String},
    value: {type: String}
  }]
}, {_id: false});

module.exports = () =>
  mongoose.model(`${config.mongo.data.collectionPrefix}TX`, TX);
