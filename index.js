/**
 * Middleware service for handling emitted events on chronobank platform
 * @module Chronobank/eth-blockprocessor
 * @requires config
 * @requires models/blockModel
 * @requires services/blockProcessService
 */

const mongoose = require('mongoose'),
  config = require('./config'),
  blockModel = require('./models/blockModel'),
  _ = require('lodash'),
  bunyan = require('bunyan'),
  amqp = require('amqplib'),
  Promise = require('bluebird'),
  requestErrors = require('request-promise-core/errors'),
  log = bunyan.createLogger({name: 'app'}),
  blockProcessService = require('./services/blockProcessService');

mongoose.Promise = Promise;
mongoose.connect(config.mongo.uri, {useMongoClient: true});

mongoose.connection.on('disconnected', function () {
  log.error('mongo disconnected!');
  process.exit(0);
});

const init = async () => {

  let currentBlock = await blockModel.findOne({network: config.waves.network}).sort('-block');
  let wrongAttempts = 0;
  currentBlock = _.chain(currentBlock).get('block', 0).add(0).value();
  log.info(`search from block:${currentBlock} for network ${config.waves.network}`);

  let amqpInstance = await amqp.connect(config.rabbit.url)
    .catch(() => {
      log.error('rabbitmq process has finished!');
      process.exit(0);
    });

  let channel = await amqpInstance.createChannel();

  channel.on('close', () => {
    log.error('rabbitmq process has finished!');
    process.exit(0);
  });

  await channel.assertExchange('events', 'topic', {durable: false});

  /**
     * Recursive routine for processing incoming blocks.
     * @return {undefined}
     */
  let processBlock = async () => {
    try {
      let result = await Promise.resolve(blockProcessService(currentBlock)).timeout(20000);

      for (let tx of result.filteredTxs) {
        let addresses = _.chain([tx.sender, tx.recipient])
          .compact()
          .uniq()
          .value();

        for (let address of addresses)
          await channel.publish('events', `${config.rabbit.serviceName}_transaction.${address}`, new Buffer(JSON.stringify(tx)));
      }

      await blockModel.findOneAndUpdate({network: config.waves.network}, {
        $set: {
          block: currentBlock,
          created: Date.now()
        }
      }, {upsert: true});

      wrongAttempts = 0;
      currentBlock = result.block;
      processBlock();
    } catch (err) {

      if (err instanceof Promise.TimeoutError)
        return processBlock();


      if (_.get(err, 'code') === 0) {
        log.info(`await for next block ${currentBlock}`);
        return setTimeout(processBlock, 10000);
      }

      if(err instanceof requestErrors.RequestError) {
        if(wrongAttempts < 3) {
          log.info(`node is not available, retrying ${wrongAttempts + 1} of 3 times`);
          wrongAttempts++;
          return setTimeout(processBlock, 10000);
        }
        log.info('node is not available!');
        process.exit(0);
      }

      currentBlock++;
      processBlock();
    }
  };

  processBlock();

}
;

module.exports = init();
