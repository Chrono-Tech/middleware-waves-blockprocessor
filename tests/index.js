const config = require('./config'),
  Promise = require('bluebird'),
  mongoose = require('mongoose');

mongoose.Promise = Promise;
mongoose.accounts = mongoose.createConnection(config.mongo.accounts.uri);
mongoose.connect(config.mongo.data.uri, {useMongoClient: true});

const expect = require('chai').expect,
  SockJS = require('sockjs-client'),
  accountModel = require('../models/accountModel'),
  amqp = require('amqplib'),
  WebSocket = require('ws'),
  clearMongoBlocks = require('./helpers/clearMongoBlocks'),
  saveAccountForAddress = require('./helpers/saveAccountForAddress'),
  connectToQueue = require('./helpers/connectToQueue'),
  clearQueues = require('./helpers/clearQueues'),
  consumeMessages = require('./helpers/consumeMessages'),
  consumeStompMessages = require('./helpers/consumeStompMessages'),
  requests = require('../services/nodeRequests'),
  Stomp = require('webstomp-client');

let accounts, amqpInstance;

describe('core/block processor', function () {

  before(async () => {
    await accountModel.remove();
    amqpInstance = await amqp.connect(config.rabbit.url);

    accounts = config.dev.accounts;
    await saveAccountForAddress(accounts[0]);
    await clearQueues(amqpInstance);
  });

  after(async () => {
    return mongoose.disconnect();
  });

  afterEach(async () => {
      await clearQueues(amqpInstance);
  });

  it('send some waves from account0 to account1 and validate countMessages(2) and structure message', async () => {

    const checkMessage = (content) => {
      expect(content).to.contain.all.keys(
        'id',
        'signature',
        'timestamp',
        'type',
        'sender',
        'recipient',
        'amount',
      );
      expect(content.sender).to.equal(accounts[0]);
      expect(content.recipient).to.equal(accounts[1]);
      expect(content.id).to.equal(transferTx.id);
    };

    const transferTx = await requests.signTransaction(
      config.dev.apiKey, accounts[1], 100, accounts[0]);

    return await Promise.all([
      (async() => {
         await requests.sendTransaction(config.dev.apiKey, transferTx);
      })(),
      (async () => {
        const channel = await amqpInstance.createChannel();  
        await connectToQueue(channel);
        return await consumeMessages(1, channel, (message) => {
          return checkMessage(JSON.parse(message.content));
        });
      })(),
      (async () => {
        const ws = new WebSocket('ws://localhost:15674/ws');
        const client = Stomp.over(ws, {heartbeat: false, debug: false});
        return await consumeStompMessages(1, client, (message) => {
          checkMessage(JSON.parse(message.body));
        });
      })()
    ]);
  });


  it('del account and send some waves from account1 to account2 and validate that zero messages', async () => {
    await accountModel.remove();
    const transferTx = await requests.signTransaction(
      config.dev.apiKey, accounts[1], 100, accounts[0]);

    return await Promise.all([
      (async() => {
         await requests.sendTransaction(config.dev.apiKey, transferTx);
      })(),
      (async () => {
        await Promise.delay(12000);
        const channel = await amqpInstance.createChannel();  
        const queue = await connectToQueue(channel);
        expect(queue.messageCount).to.equal(0);
      })()
    ]);
  });

});
