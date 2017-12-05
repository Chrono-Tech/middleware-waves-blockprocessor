require('dotenv/config');

const config = require('../config'),
  awaitLastBlock = require('./helpers/awaitLastBlock'),
  accounts = require('./factories/accountFactory'),
  transaction = require('./utils/transaction'),
  RPC = require('../utils/RPC'),
  mongoose = require('mongoose'),
  expect = require('chai').expect,
  SockJS = require('sockjs-client'),
  Promise = require('bluebird'),
  accountModel = require('../models/accountModel'),
  amqp = require('amqplib'),
  Stomp = require('webstomp-client'),
  ctx = {};

describe('core/block processor', function () {

  before(async () => {
    mongoose.Promise = Promise;
    mongoose.connect(config.mongo.uri, {useMongoClient: true});

    return await awaitLastBlock();
  });

  after(() => {
    return mongoose.disconnect();
  });

  it('remove account to mongo', async () => {
    await accountModel.remove({address: accounts[0].address});
  });

  it('add account to mongo', async () => {
    await new accountModel({address: accounts[0].address}).save();
  });

  it('send some waves from 0 account to account 1', async () => {

    let transferTx = transaction.transfer(accounts[1].address, 100000, accounts[0]);
    ctx.result = await RPC('assets.broadcast.transfer', transferTx, transferTx);
    expect(ctx.result.id).to.be.string;
  });

  it('send some eth again and validate notification via amqp', async () => {

    let amqpInstance = await amqp.connect(config.rabbit.url);
    let channel = await amqpInstance.createChannel();

    try {
      await channel.assertExchange('events', 'topic', {durable: false});
    } catch (e) {
      channel = await amqpInstance.createChannel();
    }

    return await Promise.all([
      (async () => {
        await Promise.delay(5000);
        let transferTx = transaction.transfer(accounts[1].address, 100000, accounts[0]);
        ctx.result = await RPC('assets.broadcast.transfer', transferTx, transferTx);
        console.log('published', ctx.result.id);
      })(),
      (async () => {
        try {
          await channel.assertQueue(`app_${config.rabbit.serviceName}_test.transaction`);
          await channel.bindQueue(`app_${config.rabbit.serviceName}_test.transaction`, 'events', `${config.rabbit.serviceName}_transaction.${accounts[1].address}`);
        } catch (e) {
          channel = await amqpInstance.createChannel();
        }

        return await new Promise(res => {
          channel.consume(`app_${config.rabbit.serviceName}_test.transaction`, data => {
            let tx = JSON.parse(data.content.toString());
            console.log('rmq', tx.id);
            if (tx.id === ctx.result.id)
              res();
          }, {noAck: true})
        })
      })(),
      (async () => {
        let ws = new SockJS('http://localhost:15674/stomp');
        let client = Stomp.over(ws, {heartbeat: false, debug: false});
        return await new Promise(res =>
          client.connect('guest', 'guest', () => {
            client.subscribe(`/exchange/events/${config.rabbit.serviceName}_transaction.${accounts[1].address}`, data => {
              console.log('stomp', JSON.parse(data.body).id);
              if (data.body.id === ctx.result.id)
                res();
            })
          })
        );
      })()
    ]);
  });

});
