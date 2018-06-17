/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const Promise = require('bluebird'),
  _ = require('lodash'),
  providerService = require('../../services/providerService');

module.exports = async (blockNumber) => {

  /**
   * Get raw block
   * @type {Object}
   */

  let apiProvider = await providerService.get();

  let rawBlock = await apiProvider.getBlockByNumber(blockNumber);

  if (!rawBlock)
    return Promise.reject({code: 2});

  const txs = rawBlock.transactions.map(tx => _.merge(tx, {
    blockNumber: rawBlock.number,
    hash: tx.signature,
  }));

  return {
    number: rawBlock.number,
    hash: rawBlock.hash,
    version: rawBlock.version,
    timestamp: rawBlock.timestamp || Date.now(),
    blocksize: rawBlock.blocksize,
    fee: rawBlock.fee,
    txs: txs
  };

};
