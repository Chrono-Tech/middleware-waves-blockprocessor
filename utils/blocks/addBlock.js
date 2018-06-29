/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const bunyan = require('bunyan'),
  sem = require('semaphore')(3),
  Promise = require('bluebird'),
  models = require('../../models'),
  log = bunyan.createLogger({name: 'app.services.addBlock'});

/**
 * @function
 * @description add block to the cache
 * @param block - prepared block with full txs
 * @returns {Promise.<*>}
 */

const addBlock = async (block) => {

  return new Promise((res, rej) => {

    sem.take(async () => {
      try {
        await updateDbStateWithBlock(block);
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

/**
 * @function
 * @description add new block, txs and coins to the cache
 * @param block
 * @return {Promise<void>}
 */
const updateDbStateWithBlock = async (block) => {


  let txs = block.transactions.map(tx => {
    const transformedTx = (new models.txModel(tx)).toObject();
    transformedTx._id = tx.id;
    return transformedTx;
  });


  let bulkOps = txs.map(tx => {
    return {
      updateOne: {
        filter: {_id: tx._id},
        update: tx,
        upsert: true
      }
    };
  });

  if (bulkOps.length)
    await models.txModel.bulkWrite(bulkOps);

  const toSaveBlock = (new models.blockModel(block)).toObject();
  toSaveBlock._id = block.signature;

  await models.blockModel.remove({number: toSaveBlock.number});
  return await models.blockModel.findOneAndUpdate({number: toSaveBlock.number}, toSaveBlock, {upsert: true});
};

/**
 * @function
 * @description rollback the cache to previous block
 * @param block - current block
 * @return {Promise<void>}
 */
const rollbackStateFromBlock = async (block) => {

  log.info('rolling back txs state');
  await models.txModel.remove({blockNumber: block.number});

  log.info('rolling back blocks state');
  await models.blockModel.remove({number: block.number});
};


module.exports = addBlock;
