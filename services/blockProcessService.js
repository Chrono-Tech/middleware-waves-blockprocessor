/**
 * Block processor
 * @module services/blockProcess
 * @requires services/filterTxsByAccount
 */
const _ = require('lodash'),
  Promise = require('bluebird'),
  RPC = require('../utils/RPC'),
  filterTxsByAccountService = require('./filterTxsByAccountService');

/**
 * Block processor routine
 * @param  {number} currentBlock Current block
 * @return {array}               Filtered transactions
 */

module.exports = async (currentBlock) => {
  /**
   * Get latest block number from network
   * @type {number}
   */
  let blocks = await RPC(`blocks.seq.${currentBlock}.${currentBlock + 10}`);

  blocks = _.filter(blocks, block =>
    Date.now() - block.timestamp > 1000 * 60
  );

  if (!blocks.length)
    return Promise.reject({code: 0});

  let txs = _.chain(blocks)
    .map(block => block.transactions)
    .flattenDeep()
    .value();

  let filteredTxs = await filterTxsByAccountService(txs);

  return {
    filteredTxs: filteredTxs,
    block: currentBlock + blocks.length
  }
};
