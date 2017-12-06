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
  net = require('net'),
  amqp = require('amqplib'),
  Promise = require('bluebird'),
  log = bunyan.createLogger({name: 'app'}),
  filterTxsByAccountService = require('./services/filterTxsByAccountService'),
  blockProcessService = require('./services/blockProcessService');

mongoose.Promise = Promise;
mongoose.connect(config.mongo.uri, {useMongoClient: true});

mongoose.connection.on('disconnected', function () {
  log.error('mongo disconnected!');
  process.exit(0);
});

const init = async () => {

    let currentBlock = await blockModel.findOne({network: config.waves.network}).sort('-block');
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

        currentBlock = result.block;
        processBlock();
      } catch (err) {

        console.log(err);

        if (err instanceof Promise.TimeoutError)
          return processBlock();


        if (_.get(err, 'code') === 0) {
          log.info(`await for next block ${currentBlock}`);
          return setTimeout(processBlock, 10000);
        }

        log.error('inside!');
        currentBlock++;
        processBlock();
      }
    };

    processBlock();

  }
;

module.exports = init();
