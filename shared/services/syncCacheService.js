/** 
* Copyright 2017–2018, LaborX PTY
* Licensed under the AGPL Version 3 license.
* @author Kirill Sergeev <cloudkserg11@gmail.com>
*/
const bunyan = require('bunyan'),
  _ = require('lodash'),
  Promise = require('bluebird'),
  EventEmitter = require('events'),
  allocateBlockBuckets = require('../utils/allocateBlockBuckets'),
  log = bunyan.createLogger({name: 'shared.services.syncCacheService'});

/**
 * @service
 * @description filter txs by registered addresses
 * @param block - an array of txs
 * @returns {Promise.<*>}
 */

class SyncCacheService {

  /**
   * Creates an instance of SyncCacheService.
   * @param {nodeRequests} requests
   * @param {blockRepository} repo
   * 
   * @memberOf SyncCacheService
   */
  constructor (requests, repo) {
    this.requests = requests;
    this.repo = repo;
    this.events = new EventEmitter();
    this.startIndex = 0;
    this.isSyncing = true;
  }

  async start (consensusAmount) {
    await this.indexCollection();
    let data = await allocateBlockBuckets(this.requests, this.repo, this.startIndex, consensusAmount);
    
    this.doJob(data.missedBuckets);
    return data.height;
  }

  async indexCollection () {
    log.info('indexing...');
    await this.repo.initModels();
    log.info('indexation completed!');
  }

  async doJob (buckets) {

    while (this.isSyncing)
      try {
        let locker = {stack: {}, lock: false};

        while (buckets.length)
          await this.runPeer(buckets, locker, 1);

        this.isSyncing = false;
        this.events.emit('end');

      } catch (err) {
        log.error(err);
      }

  }

  async runPeer (buckets, locker, index) {

    
    while (buckets.length) {
      
      if (locker.lock) {
        await Promise.delay(1000);
        continue;
      }

      locker.lock = true;
      let lockerChunks = _.values(locker.stack);
      let newChunkToLock = _.chain(buckets).reject(item =>
        _.find(lockerChunks, lock => lock[0] === item[0])
      ).head().value();

      let lastBlock = await this.requests.getBlockByNumber(_.last(newChunkToLock)).catch(() => {});
      locker.lock = false;
      if (!newChunkToLock || !lastBlock || !lastBlock.height) {
        delete locker.stack[index];
        await Promise.delay(10000);
        continue;
      }
      log.info(`provider ${index} took chuck of blocks ${newChunkToLock[0]} - ${_.last(newChunkToLock)}`);
      locker.stack[index] = newChunkToLock;
      await Promise.mapSeries(newChunkToLock, async (blockNumber) => {
        let block = await this.requests.getBlockByNumber(blockNumber);
        if (!block || !block.hash) 
          return Promise.reject('not find block for number=' + blockNumber);
        
        const blockWithTxsFromDb = await this.repo.saveBlock(block, block.transactions);
        _.pull(newChunkToLock, blockNumber);
        this.events.emit('block', blockWithTxsFromDb);
      }).catch((e) => {
        if (e && e.code === 11000)
          return _.pull(newChunkToLock, newChunkToLock[0]);
        log.error(e);
      });
      if (!newChunkToLock.length)
        _.pull(buckets, newChunkToLock);

      delete locker.stack[index];

    }
  }
}

module.exports = SyncCacheService;
