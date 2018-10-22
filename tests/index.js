/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */

require('dotenv/config');
process.env.LOG_LEVEL = 'fatal';
process.env.BLOCK_GENERATION_TIME = '1010';

const config = require('./config'),
  models = require('../models'),
  fuzzTests = require('./fuzz'),
  fs = require('fs'),
  request = require('request-promise'),
  spawn = require('child_process').spawn,
  performanceTests = require('./performance'),
  featuresTests = require('./features'),
  blockTests = require('./blocks'),
  Promise = require('bluebird'),
  mongoose = require('mongoose'),
  amqp = require('amqplib'),
  ctx = {};

mongoose.Promise = Promise;
mongoose.connect(config.mongo.data.uri, {useMongoClient: true});
mongoose.accounts = mongoose.createConnection(config.mongo.accounts.uri, {useMongoClient: true});


describe('core/blockProcessor', function () {

  before(async () => {
    models.init();
    ctx.accounts = config.dev.accounts;
    ctx.amqp = {};
    ctx.amqp.instance = await amqp.connect(config.rabbit.url);
    ctx.amqp.channel = await ctx.amqp.instance.createChannel();
    await ctx.amqp.channel.assertExchange('events', 'topic', {durable: false});


    if (!fs.existsSync('tests/node'))
      fs.mkdirSync('tests/node');

    if (!fs.existsSync('tests/node/waves.jar')) {
      console.log('going to install waves node');
      const release = await request({
        url: 'https://api.github.com/repos/wavesplatform/waves/releases/latest',
        json: true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      }).catch(() => {
        console.log('github api is not available, will download the 0.14.6 version of node');
        return {
          assets: [
            {
              url: 'https://api.github.com/repos/wavesplatform/Waves/releases/assets/8932223',
              browser_download_url: 'https://github.com/wavesplatform/Waves/releases/download/v0.14.6/waves-all-0.14.6.jar'
            }
          ]
        }
      });


      const nodeFile = await request({
        url: release.assets[0].browser_download_url,
        encoding: 'binary',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });

      fs.writeFileSync('tests/node/waves.jar', nodeFile, 'binary');

    }

    ctx.nodePid = spawn('java', ['-jar', 'waves.jar', 'waves-devnet.conf'], {
      env: process.env,
      stdio: 'ignore',
      cwd: 'tests/node'
    });


    await Promise.delay(20000);


  });

  after(async () => {
    mongoose.disconnect();
    mongoose.accounts.close();
    await ctx.amqp.instance.close();
  });


  describe('block', () => blockTests(ctx));

  describe('performance', () => performanceTests(ctx));

  describe('fuzz', () => fuzzTests(ctx));

  describe('features', () => featuresTests(ctx));

});
