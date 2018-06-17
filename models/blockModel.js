/**
 * Mongoose model. Represents a block in eth
 * @module models/blockModel
 * @returns {Object} Mongoose model
 *
 *
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */

const mongoose = require('mongoose'),
  config = require('../config');

const Block = new mongoose.Schema({
  version: {type: String},
  number: {type: Number, unique: true, index: true},
  hash: {type: String, unique: true, index: true}, //signature in block waves
  timestamp: {type: Date, index: true, required: true},

  blocksize: {type: String},
  fee: {type: String},
  transactionCount: {type: String},
  created: {type: Date, required: true, default: Date.now}
});

module.exports = () =>
  mongoose.model(`${config.mongo.data.collectionPrefix}Block`, Block);
