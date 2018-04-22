/**
 * 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const config = require('../config'),
  bunyan = require('bunyan'),
  _ = require('lodash'),
  Promise = require('bluebird'),

  EventEmitter = require('events'),
  log = bunyan.createLogger({name: 'app.services.blockWatchingService'});

/**
 * @service
 * @description filter txs by registered addresses
 * @param block - an array of txs
 * @returns {Promise.<*>}
 */

class blockWatchingService {

  /**
   * Creates an instance of blockWatchingService.
   * @param {nodeRequests} requests
   * @param {NodeListenerService} listener
   * @param {blockRepository} repo
   * @param {Number} currentHeight 
   * 
   * @memberOf blockWatchingService
  
   * 
   */
  constructor (requests, listener, repo, currentHeight) {

    this.requests = requests;
    this.listener = listener;
    this.repo = repo;
    this.events = new EventEmitter();
    this.currentHeight = currentHeight;
    this.lastBlocks = [];
    this.isSyncing = false;

  }

  async startSync () {

    if (this.isSyncing)
      return;

    this.isSyncing = true;

    const lastNumber = this.requests.getLastBlockNumber();
    if (!lastNumber) 
      await this.repo.removeUnconfirmedBlock();

    log.info(`caching from block:${this.currentHeight} for network:${config.node.network}`);
    this.lastBlocks = [];
    this.doJob();    
    await this.listener.onMessage( tx => this.UnconfirmedTxEvent(tx));
    
  }

  async doJob () {

    while (this.isSyncing)  
      try {
        let block = await Promise.resolve(this.processBlock()).timeout(60000*5);
        await this.repo.saveBlock(block, async (err) => {
          if (err) {
            await this.repo.removeBlocks(block.number, config.consensus.lastBlocksValidateAmount);
            log.info(`wrong sync state!, rollback to ${block.number - config.consensus.lastBlocksValidateAmount - 1} block`);
          }
        });

        this.currentHeight++;
        _.pullAt(this.lastBlocks, 0);
        this.lastBlocks.push(block.number);
        this.events.emit('block', block);
      } catch (err) {

        if (err && err.code === 'ENOENT') {
          log.error('connection is not available');
          process.exit(0);
        }

        if (err && err.code === 0) {
          log.info(`await for next block ${this.currentHeight + 1}`);
          await Promise.delay(10000);
          continue;
        }

        if ([1, 11000].includes(_.get(err, 'code'))) {
          const currentBlocks = await this.repo.findLastBlocks();
          this.lastBlocks = _.chain(currentBlocks).map(block => block.number).reverse().value();
          this.currentHeight = _.get(currentBlocks, '0.number', 0);
          continue;
        }

        if (![0, 1, 2, -32600].includes(_.get(err, 'code')))
          log.error(err);

      }
    

  }

  async UnconfirmedTxEvent (tx) {
    let currentUnconfirmedBlock = await this.repo.findUnconfirmedBlock();
    const fullTx = await this.repo.createTransactions([tx]);
    currentUnconfirmedBlock.transactions = _.union(currentUnconfirmedBlock.transactions, fullTx);

    await this.repo.saveUnconfirmedBlock(currentUnconfirmedBlock);
    this.events.emit('tx', _.get(fullTx, 0));
  }

  async stopSync () {
    this.isSyncing = false;
    await this.listener.stop();
  }


  async getNewBlock (number) {
    return await this.requests.getBlockByNumber(number).catch(() => {});
  }

  async processBlock () {
    let block = await this.getNewBlock(this.currentHeight+1);
    if (!block || block.hash === undefined) 
      return Promise.reject({code: 0});

    const lastBlocks = await this.requests.getBlocksByNumbers(this.lastBlocks);
    const lastBlockHashes = _.chain(lastBlocks).map(block => _.get(block, 'hash')).compact().value();
    
    let savedBlocks = await this.repo.findBlocksByHashes(lastBlockHashes);
    savedBlocks = _.chain(savedBlocks).map(block => block.number).orderBy().value();
    if (savedBlocks.length !== this.lastBlocks.length) 
      return Promise.reject({code: 1});

    const txs = await this.repo.createTransactions(block.transactions);    
    return this.repo.createBlock(block, txs);
  }

}

module.exports = blockWatchingService;
