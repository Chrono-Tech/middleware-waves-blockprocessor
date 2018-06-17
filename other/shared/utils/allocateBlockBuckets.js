/** 
* Copyright 2017–2018, LaborX PTY
* Licensed under the AGPL Version 3 license.
* @author Kirill Sergeev <cloudkserg11@gmail.com>
*/
const _ = require('lodash'),
  bunyan = require('bunyan'),
  Promise = require('bluebird'),
  log = bunyan.createLogger({name: 'shared.utils.allocateBlockBuckets'});

/**
 * @param {../services/nodeRequests} requests
 * @param {../services/blockrepository} repo 
 * @param {Number} consensusAmount
 * @param {Number} startIndex
 * 
 **/
module.exports = async function (requests, repo, startIndex, consensusAmount) {

  const currentBlock = await repo.findLastBlockNumber();
  
  const currentCacheHeight = _.get(currentBlock, 'number', -1);

  let blockNumbers = [];
  for (let i = startIndex; i < currentCacheHeight; i++)
    blockNumbers.push(i);

  const blockNumberChunks = _.chunk(blockNumbers, 10000);
  let missedBuckets = [];
  const missedBlocks = [];

  for (let blockNumberChunk of blockNumberChunks) {
    log.info(`validating blocks from: ${_.head(blockNumberChunk)} to ${_.last(blockNumberChunk)}`);
    const count = await repo.countBlocksForNumbers(blockNumberChunk);
    
    if (count !== blockNumberChunk.length && count)
      missedBuckets.push(blockNumberChunk);
    if (!count)
      for (let blockNumber of blockNumberChunk)
        missedBlocks.push(blockNumber);
  }

  for (let missedBucket of missedBuckets)
    if (missedBucket.length)
      for (let blockNumber of missedBucket) {
        log.info(`validating block: ${blockNumber}`);
        const isExist = await repo.countBlocksForNumbers([blockNumber]);
        if (!isExist)
          missedBlocks.push(blockNumber);
      }

  let currentNodeHeight = await Promise.resolve(await requests.getLastBlockNumber()).timeout(10000).catch(() => -1);
  for (let i = currentCacheHeight + 1; i < currentNodeHeight - consensusAmount; i++)
    missedBlocks.push(i);
  missedBuckets = _.chain(missedBlocks).reverse().uniq().filter(number=> number < currentNodeHeight - consensusAmount).chunk(10000).value();

  if (currentNodeHeight === -1) 
    return Promise.reject({code: 0});

  return {missedBuckets: missedBuckets, height: currentNodeHeight - consensusAmount};

};
