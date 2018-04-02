/**
 * Middleware service for handling emitted events on chronobank platform
 * @module Chronobank/waves-blockprocessor
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
  BlockWatchingService = require('./services/blockWatchingService'),
  SyncCacheService = require('./services/syncCacheService'),
  log = bunyan.createLogger({name: 'core.blockProcessor'}),

  NodeListenerService = require('./services/nodeListenerService'),  
  blockRepo = require('./services/blockRepository'),
  requests = require('./services/nodeRequests'),

  W3CWebSocket = require('websocket').w3cwebsocket,
  WebSocketAsPromised = require('websocket-as-promised');

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

const wsp = new WebSocketAsPromised(config.node.ws, {
    createWebSocket: url => new W3CWebSocket(url)
  }),
  listener = new NodeListenerService(wsp);

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

  const syncCacheService = new SyncCacheService(requests, blockRepo);


  syncCacheService.events.on('block', async block => {
    log.info(`${block.hash} (${block.number}) added to cache.`);
    let filtered = await filterTxsByAccountsService(block.transactions);
    await Promise.all(filtered.map(item =>
      channel.publish('events', `${config.rabbit.serviceName}_transaction.${item.address}`, new Buffer(JSON.stringify(Object.assign(item, {block: block.number}))))
    ));
  });

  let endBlock = await syncCacheService.start()
    .catch((err) => {
      if (_.get(err, 'code') === 0) {
        log.info('nodes are down or not synced!');
        process.exit(0);
      }
      log.error(err);
    });

  await new Promise((res) => {
    if (config.sync.shadow)
      return res();

    syncCacheService.events.on('end', () => {
      log.info(`cached the whole blockchain up to block: ${endBlock}`);
      res();
    });
  });

  const blockWatchingService = new BlockWatchingService(requests, listener, blockRepo, endBlock);

  await blockWatchingService.startSync().catch(e => {
    log.error(`error starting cache service: ${e}`);
    process.exit(0);
  });

  blockWatchingService.events.on('block', async block => {
    log.info(`${block.hash} (${block.number}) added to cache.`);
    let filtered = await filterTxsByAccountsService(block.transactions);
    await Promise.all(filtered.map(item =>
      channel.publish('events', `${config.rabbit.serviceName}_transaction.${item.address}`, new Buffer(JSON.stringify(Object.assign(item, {block: block.number}))))
    ));
  });

  blockWatchingService.events.on('tx', async (tx) => {
    let filtered = await filterTxsByAccountsService([tx]);
    await Promise.all(filtered.map(item =>
      channel.publish('events', `${config.rabbit.serviceName}_transaction.${item.address}`, new Buffer(JSON.stringify(Object.assign(item, {block: -1}))))
    ));
  });

};

module.exports = init();
