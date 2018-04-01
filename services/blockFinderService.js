const config = require('../config'),
  bunyan = require('bunyan'),
  _ = require('lodash'),
  sem = require('semaphore')(1),

  log = bunyan.createLogger({name: 'app.services.blockWatchingService'}),
  blockModel = require('../models/blockModel');

const findLastBlocks = async () => {
  return await blockModel.find({
    network: config.node.network,
    timestamp: {
      $ne: 0
    }
  }).sort({
    number: -1
  }).limit(config.consensus.lastBlocksValidateAmount);
};

const getUnconfirmedBlock = async () => {
  return await blockModel.findOne({
    number: -1
  }) || new blockModel({
    number: -1,
    hash: null,
    timestamp: 0,
    transactions: []
  });
};

const getBlocksByHashes = async (hashes) => {
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

const removeUnconfirmedBlock = async () => {
  return await blockModel.remove({
    number: -1
  });
};

const updateUnconfirmedBlock = async (block) => {
  return await blockModel.findOneAndUpdate({
    number: -1
  }, _.omit(block.toObject(), '_id', '__v'), {
    upsert: true
  });
};


const createBlock = (block, txs = []) => {
  return _.merge(block, {
    network: config.node.network,
    number: block.height,
    hash: block.signature,
    transactions: _.merge(block.transactions, txs),
    timestamp: block.time || Date.now(),
  });
};

const initModels = async () => {
  await blockModel.init();  
};

const transformBlockTxs = async (txs) => {
  return Promise.resolve(txs);
};

const addBlock = async (block, type, callback) => {
  if (block.txs) 
    block.txs = await transformBlockTxs(block.txs);
  block = createBlock(block);

  sem.take(async () => {
    try {
      await updateDbStateWithBlock(block);
      
      callback();
    } catch (e) {
      if (type === 1 && [1, 11000].includes(_.get(e, 'code'))) {
        let lastCheckpointBlock = await blockModel.findOne({
          number: {
            $lte: block.number - 1,
            $gte: block.number - 1 + config.consensus.lastBlocksValidateAmount
          }
        }, {}, {number: -1});
        log.info(`wrong sync state!, rollback to ${lastCheckpointBlock.number - 1} block`);
        await rollbackStateFromBlock(lastCheckpointBlock);
      }

      callback(e, null);
      log.error(e);
    }

    sem.leave();
  });

};

const updateDbStateWithBlock = async (block) => {

  await blockModel.findOneAndUpdate({number: block.number}, block, {upsert: true});
  await blockModel.update({number: -1}, {
    $pull: {
      transactions: {
        hash: {
          $in: block.transactions.map(tx => tx.hash)
        }
      }
    }
  });

};


const rollbackStateFromBlock = async (block) => {

  await blockModel.remove({
    $or: [
      {hash: {$lte: block.number, $gte: block.number - config.consensus.lastBlocksValidateAmount}},
      {number: {$gte: block.number}}
    ]
  });
};

const findAllBlockNumbers = async () => {
  return await blockModel.findOne({network: config.node.network}, {number: 1}, {sort: {number: -1}});
};

const countBlocksForNumbers = async (blockNumberChunk) => {
  return await blockModel.count({network: config.node.network, number: {$in: blockNumberChunk}});
};


module.exports = {
  addBlock,
  findLastBlocks,
  getBlocksByHashes,
  createBlock,
  initModels,
  transformBlockTxs,
  removeUnconfirmedBlock,
  updateUnconfirmedBlock,
  getUnconfirmedBlock,

  findAllBlockNumbers,
  countBlocksForNumbers
};
