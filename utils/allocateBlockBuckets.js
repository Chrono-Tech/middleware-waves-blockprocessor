const _ = require('lodash'),
  config = require('../config'),
  bunyan = require('bunyan'),
  Promise = require('bluebird'),
  log = bunyan.createLogger({name: 'app.utils.allocateBlockBuckets'});

/**
 * @param {NodeFinderService} finder
 * @param {NodeSenderService} sender
 * 
 **/
module.exports = async function (sender, finder) {

  const currentBlock = await finder.findLastBlockNumber();
  
  const currentCacheHeight = _.get(currentBlock, 'number', -1);

  let blockNumbers = [];
  for (let i = 1; i < currentCacheHeight; i++)
    blockNumbers.push(i);

  const blockNumberChunks = _.chunk(blockNumbers, 10000);
  let missedBuckets = [];
  const missedBlocks = [];

  for (let blockNumberChunk of blockNumberChunks) {
    log.info(`validating blocks from: ${_.head(blockNumberChunk)} to ${_.last(blockNumberChunk)}`);
    const count = await finder.countBlocksForNumbers(blockNumberChunk);
    
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
        const isExist = await finder.countBlocksForNumbers([blockNumber]);
        if (!isExist)
          missedBlocks.push(blockNumber);
      }

  let currentNodeHeight = await Promise.resolve(sender.getLastBlockNumber()).timeout(10000).catch(() => -1);

  for (let i = currentCacheHeight + 1; i < currentNodeHeight - config.consensus.lastBlocksValidateAmount; i++)
    missedBlocks.push(i);

  missedBuckets = _.chain(missedBlocks).reverse().uniq().filter(number=> number < currentNodeHeight - config.consensus.lastBlocksValidateAmount).chunk(10000).value();

  if (currentNodeHeight === -1)
    return Promise.reject({code: 0});

  return {missedBuckets: missedBuckets, height: currentNodeHeight - config.consensus.lastBlocksValidateAmount};

};
