/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const Promise = require('bluebird'),
  _ = require('lodash'),
  config = require('../../config'),
  providerService = require('../../services/providerService');


/**
 * @function
 * @description get block from the node
 * @param blockNumber
 * @return {Promise<{number: *, timestamp: *, hash: *, signer: *, txs: *}>}
 */
module.exports = async (blockNumber) => {

  let apiProvider = await providerService.get();

  let rawBlock = await apiProvider.getBlockByNumber(blockNumber);

  if (!rawBlock)
    return Promise.reject({code: 2});

  if(Date.now() - _.get(rawBlock, 'timestamp', Date.now()) < config.node.blockGenerationTime)
    return Promise.reject({code: 0});

  const txs = rawBlock.transactions.map(tx =>
    _.merge(tx, {
      blockNumber: rawBlock.number,
      signature: tx.signature || tx.id
    }));

  return {
    number: rawBlock.number,
    signature: rawBlock.signature,
    version: rawBlock.version,
    timestamp: rawBlock.timestamp || Date.now(),
    blocksize: rawBlock.blocksize,
    fee: rawBlock.fee,
    transactions: txs
  };

};
