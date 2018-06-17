/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const bunyan = require('bunyan'),
  _ = require('lodash'),
  addBlock = require('../utils/blocks/addBlock'),
  providerService = require('../services/providerService'),
  models = require('../models'),
  Promise = require('bluebird'),
  getBlock = require('../utils/blocks/getBlock'),
  addUnconfirmedTx = require('../utils/txs/addUnconfirmedTx'),
  removeUnconfirmedTxs = require('../utils/txs/removeUnconfirmedTxs'),
  EventEmitter = require('events'),
  log = bunyan.createLogger({name: 'shared.services.blockWatchingService'});

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
  constructor (currentHeight) {
    this.events = new EventEmitter();
    this.currentHeight = currentHeight;
    this.isSyncing = false;
  }

  async startSync () {

    if (this.isSyncing)
      return;

    this.isSyncing = true;
    await providerService.get();

    await removeUnconfirmedTxs();

    log.info(`caching from block:${this.currentHeight}`);
    this.lastBlockHash = null;
    this.doJob();

    this.unconfirmedTxEventCallback = result => this.unconfirmedTxEvent(result).catch();
    providerService.events.on('unconfirmedTx', this.unconfirmedTxEventCallback);

  }

  async doJob () {

    while (this.isSyncing)
      try {
        const block = await this.processBlock();
        await addBlock(block);

        this.currentHeight++;
        this.lastBlockHash = block.hash;
        this.events.emit('block', block);
      } catch (err) {

        if (err && err.code === 0) {
          log.info(`await for next block ${this.currentHeight}`);
          await Promise.delay(10000);
          continue;
        }

        if (_.get(err, 'code') === 1) {
          log.info(`wrong sync state!, rollback to ${this.currentHeight - 1} block`);

          const currentBlock = await models.blockModel.find({
            number: {$gte: 0}
          }).sort({number: -1}).limit(2);
          this.lastBlockHash = _.get(currentBlock, '1._id');
          this.currentHeight = _.get(currentBlock, '0.number', 0);

          continue;
        }

        log.error(err);

      }
  }

  async unconfirmedTxEvent (tx) {
    tx = await addUnconfirmedTx(tx);
    this.events.emit('tx', tx);
  }

  async stopSync () {
    this.isSyncing = false;
  }

  async processBlock () {

    const apiProvider = await providerService.get();
    let block = await apiProvider.getHeight();

    if (block === this.currentHeight - 1)
      return Promise.reject({code: 0});

    const lastBlock = this.currentHeight === 0 ? null :
      await apiProvider.getBlockByNumber(this.currentHeight - 1);

    if (this.lastBlockHash !== null && this.currentHeight > 1) {
      let savedBlock = await models.blockModel.count({hash: lastBlock.prevBlockHash.data});

      if (!savedBlock)
        return Promise.reject({code: 1});
    }

    return getBlock(this.currentHeight);
  }

}

module.exports = blockWatchingService;
