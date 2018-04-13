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
   * @param {NodeRequestService} sender
   * @param {NodeListenerService} listener
   * @param {BlockFinderService} finder
   * @param {Number} currentHeight 
   * 
   * @memberOf blockWatchingService
  
   * 
   */
  constructor (sender, listener, finder, currentHeight) {

    this.sender = sender;
    this.listener = listener;
    this.finder = finder;
    this.events = new EventEmitter();
    this.currentHeight = currentHeight;
    this.lastBlocks = [];
    this.isSyncing = false;

  }

  async startSync () {

    if (this.isSyncing)
      return;

    this.isSyncing = true;

    const lastNumber = this.sender.getLastBlockNumber();
    if (!lastNumber) 
      await this.finder.removeUnconfirmedBlock();

    log.info(`caching from block:${this.currentHeight} for network:${config.node.network}`);
    this.lastBlocks = [];
    this.doJob();
    await this.listener.onMessage( tx => this.UnconfirmedTxEvent(tx));
  }

  async doJob () {

    while (this.isSyncing) 

      try {

        let block = await Promise.resolve(this.processBlock()).timeout(60000 * 5);
        await new Promise.promisify(this.finder.addBlock.bind(null, block, 1))();
        this.currentHeight++;
        _.pullAt(this.lastBlocks, 0);
        this.lastBlocks.push(block.hash);
        this.events.emit('block', block);
      } catch (err) {

        if (err && err.code === 'ENOENT') {
          log.error('connection is not available');
          process.exit(0);
        }

        if (err.code === 0) {
          log.info(`await for next block ${this.currentHeight + 1}`);
          await Promise.delay(10000);
          continue;
        }

        if ([1, 11000].includes(_.get(err, 'code'))) {
          const currentBlocks = await this.finder.findLastBlocks();
          this.lastBlocks = _.chain(currentBlocks).map(block => block.hash).reverse().value();
          this.currentHeight = _.get(currentBlocks, '0.number', 0);
          continue;
        }

        if (![0, 1, 2, -32600].includes(_.get(err, 'code')))
          log.error(err);

      }
    

  }

  async UnconfirmedTxEvent (tx) {
    let currentUnconfirmedBlock = await this.finder.getUnconfirmedBlock();
    const fullTx = await this.finder.transformBlockTxs([tx]);

    currentUnconfirmedBlock.transactions = _.union(currentUnconfirmedBlock.transactions, fullTx);
    await await this.finder.updateUnconfirmedBlock(currentUnconfirmedBlock);
    this.events.emit('tx', _.get(fullTx, 0));
  }

  async stopSync () {
    this.isSyncing = false;
    await this.listener.stop();
  }


  async checkLastSavedBlock () {
    const block =  await this.sender.getBlockByNumber(this.currentHeight);
    if (block && block.hash !== undefined && block.hash !== this.lastBlocks[0]) { //heads are equal
      this.currentHeight--;
      this.lastBlocks.splice(0, 1);
    }
  }

  async processBlock () {

    let block =  await this.sender.getBlockByNumber(this.currentHeight+1);
    if (!block || block.hash === undefined) {
      await this.checkLastSavedBlock();
      return Promise.reject({code: 0});
    }

    const lastBlocks = await this.sender.getBlocksByHashes(this.lastBlocks);
    const lastBlockHashes = _.chain(lastBlocks).map(block => _.get(block, 'hash')).compact().value();
    let savedBlocks = await this.finder.getBlocksByHashes(lastBlockHashes);
    savedBlocks = _.chain(savedBlocks).map(block => block.number).orderBy().value();

    if (savedBlocks.length !== this.lastBlocks.length)
      return Promise.reject({code: 1}); //head has been blown off

    const txs = await this.finder.transformBlockTxs(block.transactions);
    return this.finder.createBlock(block, txs);
  }

}

module.exports = blockWatchingService;
