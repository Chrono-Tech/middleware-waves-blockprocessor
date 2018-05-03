/**
 * Middleware service for handling emitted events on chronobank platform
 * @module Chronobank/waves-blockprocessor
 * 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const mongoose = require('mongoose'),
  config = require('./config'),
  Promise = require('bluebird');

mongoose.Promise = Promise;
mongoose.connect(config.mongo.data.uri, {useMongoClient: true});
mongoose.accounts = mongoose.createConnection(config.mongo.accounts.uri, {useMongoClient: true});

const  filterTxsByAccountsService = require('./services/filterTxsByAccountsService'),
  amqp = require('amqplib'),
  bunyan = require('bunyan'),
  _ = require('lodash'),
  log = bunyan.createLogger({name: 'core.blockProcessor'}),
  

  MasterNodeService = require('./shared/services/MasterNodeService'), 
  SyncCacheService = require('./shared/services/syncCacheService'),
  ProviderService = require('./shared/services/providerService'),

  WavesBlockWatchingService = require('./services/wavesBlockWatchingService'),

  NodeListenerService = require('./services/nodeListenerService'),  
  blockRepo = require('./services/blockRepository'),
  requests = require('./services/nodeRequests');

/**
 * @module entry point
 * @description process blocks, and notify, through rabbitmq, other
 * services about new block or tx, where we meet registered address
 */

[mongoose.accounts, mongoose.connection].forEach(connection =>
  connection.on('disconnected', function () {
    log.error('mongo disconnected!');
    process.exit(0);
  })
);


const init = async function () {

  let amqpConn = await amqp.connect(config.rabbit.url)
    .catch(() => {
      log.error('rabbitmq is not available!');
      process.exit(0);
    });

  let channel = await amqpConn.createChannel();

  channel.on('close', () => {
    log.error('rabbitmq process has finished!');
    process.exit(0);
  });

  try {
    await channel.assertExchange('events', 'topic', {durable: false});
  } catch (e) {
    log.error(e);
    channel = await amqpConn.createChannel();
  }

  let blockEventCallback = async block => {
    //log.info(`${block.hash} (${block.number}) added to cache.`);
    let filtered = await filterTxsByAccountsService(block.transactions);
    await Promise.all(filtered.map(item => {
      log.info('confirmed', item.hash, item.blockNumber);      
      channel.publish('events', `${config.rabbit.serviceName}_transaction.${item.address}`, new Buffer(JSON.stringify(Object.assign(item))))
    }));
  };
  let txEventCallback = async tx => {
    let filtered = await filterTxsByAccountsService([tx]);
    await Promise.all(filtered.map(item => {
      log.info('unconfirmed', item.hash, item.blockNumber);
      channel.publish('events', `${config.rabbit.serviceName}_transaction.${item.address}`, new Buffer(JSON.stringify(Object.assign(item))))
    }));
  };

  const masterNodeService = new MasterNodeService(channel, config.rabbit.serviceName);
  await masterNodeService.start();

  const providerService = new ProviderService(config.node.providers, requests.getHeightForProvider);
  await providerService.selectProvider();

  const listener = new NodeListenerService(providerService);
  
  const requestsInstance = requests.createInstance(providerService);
  const syncCacheService = new SyncCacheService(requestsInstance, blockRepo);
  syncCacheService.startIndex = 1;


  syncCacheService.events.on('block', blockEventCallback);


  let endBlock = await syncCacheService.start(config.consensus.lastBlocksValidateAmount).catch((err) => {
    if (_.get(err, 'code') === 0) 
      log.info('nodes are down or not synced!');
    else 
      log.error(err);
    process.exit(0);
  });

  await new Promise(res => {
    if (config.sync.shadow)
      return res();

    syncCacheService.events.on('end', () => {
      log.info(`cached the whole blockchain up to block: ${endBlock}`);
      res();
    });
  });

  const blockWatchingService = new WavesBlockWatchingService(requestsInstance, listener, blockRepo, endBlock);  
  blockWatchingService.setNetwork(config.node.network);
  blockWatchingService.setConsensusAmount(config.consensus.lastBlocksValidateAmount);
  blockWatchingService.events.on('block', blockEventCallback);
  blockWatchingService.events.on('tx', txEventCallback);

  const provider = await providerService.getProvider();
  await blockWatchingService.startSync(provider.getHeight()).catch(err => {
    if (_.get(err, 'code') === 0) {
      log.error('no connections available or blockchain is not synced!');
      process.exit(0);
    }
  });

};

module.exports = init();
