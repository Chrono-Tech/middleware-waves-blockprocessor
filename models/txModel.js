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

const TX = new mongoose.Schema({
  _id: {type: String},
  blockNumber: {type: Number, required: true, index: true, default: -1},
  timestamp: {type: Number, required: true, index: true, default: Date.now},
  amount: {type: Number},
  type: {type: Number},
  recipient: {type: String, index: true},
  sender: {type: String, index: true},
  assetId: {type: String, index: true},
  feeAsset: {type: String},
  attachment: {type: String},
  fee: {type: String},
  transfers: [{
    recipient: {type: String, index: true},
    amount: {type: Number}
  }]
}, {_id: false});

module.exports = () =>
  mongoose.model(`${config.mongo.data.collectionPrefix}TX`, TX);
