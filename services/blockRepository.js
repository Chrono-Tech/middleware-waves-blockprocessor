/**
 * 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const config = require('../config'),
  _ = require('lodash'),
  sem = require('semaphore')(1),

  blockModel = require('../models/blockModel'),
  txModel = require('../models/txModel'),
  bunyan = require('bunyan'),
  log = bunyan.createLogger({name: 'app.services.blockRepository'});

/**
 * @return {Promise return blockModels}
 */
const findLastBlocks = async () => {
  return await blockModel.find({
    timestamp: {
      $ne: 0
    }
  }).sort({
    number: -1
  }).limit(config.consensus.lastBlocksValidateAmount);
};


/**
 * @param {Array of String} hashes
 * @return {Array of blockModel}
 */
const findBlocksByHashes = async (hashes) => {
  if (hashes.length === 0) 
    return [];
  return await blockModel.find({
    hash: {
      $in: hashes
    }
  }, {
    number: 1
  });
};

/**
 * @return {Promise}
 */
const removeUnconfirmedTxs = async () => {
  await txModel.remove({
    blockNumber: -1
  });
};

/**
 * 
 * @param {blockModel} block 
 * @return {Promise return [{Object} of tx]}
 */
const saveUnconfirmedTxs = async (inputTxs) => {
  const txs = await createTransactions(inputTxs, -1);

  await txModel.insertMany(txs).catch(log.error.bind(log));

  return txs;
};

/**
 * 
 * @param {blockModel} block 
 * @return {blockModel} 
 */
const createBlock = (block) => {
  return _.merge(block, {
    network: config.node.network,
    number: block.height,
    hash: block.signature,
    timestamp: block.time || Date.now(),
  });
};

/**
 * @return {Promise}
 */
const initModels = async () => {
  await blockModel.init();  
  await txModel.init();
};

/**
 * 
 * @param {Array of blockModel.transaction} txs 
 * @return {Promise return Array of blockModel.transaction}
 */
const createTransactions = async (txs, blockNumber) => {
  return _.map(txs, tx => _.merge(tx, {
    blockNumber,
    hash: tx.signature,
  }));
};

/**
 * @param {blockModel} block
 * @param {function return Promise} afterSave
 * @return {Promise return Object {block merge with transactions}}
 * 
 **/
const saveBlock = async (block, txs, afterSave = () => {}) => {
  block = createBlock(block);

  await new Promise(async (res) => {
    sem.take(async () => {
      try {
        txs = await createTransactions(txs, block.height);
        await insertTransactions(txs);
        await insertBlock(block);
        await afterSave(null);
      } catch (e) {
        await afterSave(e, null);
      }
      sem.leave();
      res();
    });
  });

  return _.merge(block, {
    transactions: txs
  });
};

/**
 * 
 * @param {Number} startNumber 
 * @param {Number} limit 
 * @return {Promise}
 */
const removeBlocksForNumbers = async (startNumber, limit) => {
  await blockModel.remove({number: {$gte:  startNumber - limit}}).catch(log.error);
};

/**
 * 
 * @param {Number} startNumber 
 * @return {Promise}
 */
const removeTxsForNumbers = async (startNumber, limit) => {
  await txModel.remove({blockNumber: {$gte:  startNumber - limit}}).catch(log.error);
};

const insertBlock = async (block) => {
  await blockModel.findOneAndUpdate({number: block.number}, block, {upsert: true});
};

const insertTransactions  = async (txs) => {
  if (txs.length !== 0) {
    await txModel.remove({
      hash: {$in: txs.map(tx => tx.hash)}
    }).catch(log.error);

    await txModel.insertMany(txs).catch(log.error.bind(log));
  }
};

/**
 * @return {Promise return Number}
 */
const findLastBlockNumber = async () => {
  return await blockModel.findOne({}, {number: 1}, {sort: {number: -1}});
};

/**
 * 
 * @param {Array of Number} blockNumberChunk 
 * @return {Promise return Array of blockModel}
 */
const countBlocksForNumbers = async (blockNumberChunk) => {
  return await blockModel.count({number: {$in: blockNumberChunk}});
};


module.exports = {
  initModels,
  
  createBlock,
  createTransactions,


  findLastBlocks,
  findBlocksByHashes,
  findLastBlockNumber,
  countBlocksForNumbers,

  saveBlock,
  removeBlocksForNumbers,
  removeTxsForNumbers,

  saveUnconfirmedTxs,   
  removeUnconfirmedTxs   
};
