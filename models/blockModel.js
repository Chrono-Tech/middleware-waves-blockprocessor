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
  _id: {type: String},
  version: {type: String},
  number: {type: Number, unique: true, index: true},
  timestamp: {type: Date, index: true, required: true},
  blocksize: {type: String},
  fee: {type: String},
  created: {type: Date, required: true, default: Date.now}
}, {_id: false});

module.exports = () =>
  mongoose.model(`${config.mongo.data.collectionPrefix}Block`, Block);
