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
  Promise = require('bluebird'),
  MasterNodeService = require('middleware-common-components/services/blockProcessor/MasterNodeService'),
  models = require('./models'),
  BlockWatchingService = require('./services/blockWatchingService'),
  SyncCacheService = require('./services/syncCacheService'),
  filterTxsByAccountService = require('./services/filterTxsByAccountService'),
  amqp = require('amqplib'),
  bunyan = require('bunyan'),
  log = bunyan.createLogger({name: 'core.blockProcessor'});


mongoose.Promise = Promise;
mongoose.connect(config.mongo.data.uri, {useMongoClient: true});
mongoose.accounts = mongoose.createConnection(config.mongo.accounts.uri, {useMongoClient: true});


const init = async function () {

  [mongoose.accounts, mongoose.connection].forEach(connection =>
    connection.on('disconnected', () => {
      throw new Error('mongo disconnected!');
    })
  );

  models.init();

  let amqpInstance = await amqp.connect(config.rabbit.url);

  let channel = await amqpInstance.createChannel();

  channel.on('close', () => {
    throw new Error('rabbitmq process has finished!');
  });

  await channel.assertExchange('events', 'topic', {durable: false});

  const masterNodeService = new MasterNodeService(channel, config.rabbit.serviceName);
  await masterNodeService.start();

  const syncCacheService = new SyncCacheService();


  let blockEventCallback = async block => {
    log.info(`${block.hash} (${block.number}) added to cache.`);
    let filtered = await filterTxsByAccountService(block.txs);
    await Promise.all(filtered.map(item => {
      log.info('confirmed', item.hash, item.blockNumber);
      channel.publish('events', `${config.rabbit.serviceName}_transaction.${item.address}`, new Buffer(JSON.stringify(Object.assign(item))))
    }));
  };
  let txEventCallback = async tx => {
    let filtered = await filterTxsByAccountService([tx]);
    await Promise.all(filtered.map(item => {
      log.info('unconfirmed', item.hash, item.blockNumber);
      channel.publish('events', `${config.rabbit.serviceName}_transaction.${item.address}`, new Buffer(JSON.stringify(Object.assign(item))))
    }));
  };

  syncCacheService.events.on('block', blockEventCallback);


  let endBlock = await syncCacheService.start();

  await new Promise(res => {
    if (config.sync.shadow)
      return res();

    syncCacheService.events.on('end', () => {
      log.info(`cached the whole blockchain up to block: ${endBlock}`);
      res();
    });
  });

    const blockWatchingService = new BlockWatchingService(endBlock);

    blockWatchingService.events.on('block', blockEventCallback);
    blockWatchingService.events.on('tx', txEventCallback);

    await blockWatchingService.startSync(endBlock);

};

module.exports = init().catch(err => {
  log.error(err);
  process.exit(0);
});
