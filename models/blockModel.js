/**
 * Mongoose model. Represents a block in waves
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

require('mongoose-long')(mongoose);

const Block = new mongoose.Schema({
  _id: {type: String},
  version: {type: Number},
  number: {type: Number, unique: true, index: true},
  timestamp: {type: Date, index: true, required: true},
  blocksize: {type: Number},
  fee: {type: mongoose.Schema.Types.Long},
  created: {type: Date, required: true, default: Date.now}
}, {_id: false});

module.exports = () =>
  mongoose.model(`${config.mongo.data.collectionPrefix}Block`, Block);
