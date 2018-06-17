/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const bunyan = require('bunyan'),
  _ = require('lodash'),
  //removeUnconfirmedTxs = require('../txs/removeUnconfirmedTxs'),
  //crypto = require('crypto'),
  sem = require('semaphore')(3),
  Promise = require('bluebird'),
  models = require('../../models'),
  log = bunyan.createLogger({name: 'app.services.addBlock'});

/**
 * @service
 * @description filter txs by registered addresses
 * @param block - the block object
 * @param removePending - remove unconfirmed txs, which has been pulled from mempool
 * @returns {Promise.<*>}
 */

const addBlock = async (block, removePending = false) => {

  return new Promise((res, rej) => {

    sem.take(async () => {
      try {
        await updateDbStateWithBlock(block, removePending);
        res();
      } catch (err) {
        log.error(err);
        await rollbackStateFromBlock(block);
        rej(err);
      }
      sem.leave();
    });

  });

};

const updateDbStateWithBlock = async (block) => {

  let bulkOps = block.txs.map(tx => {
    return {
      updateOne: {
        filter: {hash: tx.hash},
        update: tx,
        upsert: true
      }
    };
  });

  if (bulkOps.length)
    await models.txModel.bulkWrite(bulkOps);

  const toSaveBlock = _.omit(block, 'txs');
  return await models.blockModel.findOneAndUpdate({number: toSaveBlock.number}, toSaveBlock, {upsert: true});
};

const rollbackStateFromBlock = async (block) => {

  log.info('rolling back txs state');
  await models.txModel.remove({blockNumber: block.number});

  log.info('rolling back blocks state');
  await models.blockModel.remove({number: block.number});
};


module.exports = addBlock;
