/**
 *
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const config = require('./config'),
  Promise = require('bluebird'),
  mongoose = require('mongoose'),
  expect = require('chai').expect,
  models = require('../models'),
  amqp = require('amqplib'),
  connectToQueue = require('./helpers/connectToQueue'),
  clearQueues = require('./helpers/clearQueues'),
  consumeMessages = require('./helpers/consumeMessages'),
  providerService = require('./services/providerService'),
  createIssue = require('./helpers/createIssue'),
  ASSET_NAME = 'LLLLLLLLLLLL';

let accounts, amqpInstance, assetId;

mongoose.Promise = Promise;
mongoose.accounts = mongoose.createConnection(config.mongo.accounts.uri);
mongoose.connect(config.mongo.data.uri, {useMongoClient: true});


const checkMessage = (content) => {
  expect(content).to.contain.all.keys(
    'id',
    'signature',
    'timestamp',
    'type',
    'sender',
    'recipient',
    'amount'
  );
  expect(content.sender).to.equal(accounts[0]);
  expect(content.recipient).to.equal(accounts[1]);

  return true;
};

describe('core/block processor', function () {

  before(async () => {
    models.init();
    await models.accountModel.remove();
    amqpInstance = await amqp.connect(config.rabbit.url);

    accounts = config.dev.accounts;
    await models.accountModel.create({address: accounts[0]});
    await clearQueues(amqpInstance);

    assetId = await createIssue(ASSET_NAME, accounts[0]);
  });

  after(async () => {
    return mongoose.disconnect();
  });

  afterEach(async () => {
    await clearQueues(amqpInstance);
  });


  it('send some assets from account0 to account1 and validate countMessages(2) and structure message', async () => {

    const provider = await providerService.get();

    const tx = await provider.signAssetTransaction(
      config.dev.apiKey, accounts[1], 100, accounts[0], assetId);

    return await Promise.all([
      (async () => {
        await provider.sendAssetTransaction(config.dev.apiKey, tx);
      })(),
      (async () => {
        const channel = await amqpInstance.createChannel();
        await connectToQueue(channel);
        return await consumeMessages(1, channel, (message) => {
          const content = JSON.parse(message.content);
          if (content.id === tx.id)
            return checkMessage(content);
          return false;
        });
      })()
    ]);
  });

});
