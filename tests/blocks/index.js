/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const models = require('../../models'),
  _ = require('lodash'),
  uniqid = require('uniqid'),
  config = require('../../config'),
  filterTxsByAccountService = require('../../services/filterTxsByAccountService'),
  getBlock = require('../../utils/blocks/getBlock'),
  addBlock = require('../../utils/blocks/addBlock'),
  allocateBlockBuckets = require('../../utils/blocks/allocateBlockBuckets'),
  waitTransaction = require('../utils/waitTransaction'),
  addUnconfirmedTx = require('../../utils/txs/addUnconfirmedTx'),
  expect = require('chai').expect,
  Promise = require('bluebird'),
  sender = require('../utils/sender'),
  spawn = require('child_process').spawn,
  providerService = require('../../services/providerService');

module.exports = (ctx) => {

  before (async () => {
    await models.blockModel.remove({});
    await models.txModel.remove({});
    await models.accountModel.remove({});
    config.node.blockGenerationTime = 100;
  });

  after(() => {
    config.node.blockGenerationTime = 60000;
  });



/*  it('get block', async () => {
    const instance = await providerService.get();
    const height = await instance.getHeight();
    const blockFromNode = await instance.getBlockByNumber(height - 1);

    const block = await getBlock(height - 1);

    expect(block).to.have.keys(
      'number', 'blocksize','timestamp', 'version',
      'signature', 'transactions', 'fee'
    );

    for (let tx of block.transactions) 
      expect(tx).to.have.keys(
        'signature', 
        'blockNumber', 
        'timestamp', 
        'amount', 
        'recipient', 
        'type',
        'fee',
        'feeAsset',
        'fee', 'sender'
      );

  });
*/
  it('add block', async () => {

    const instance = await providerService.get();
    const height = await instance.getHeight();

    const block = await getBlock(height - 1);
    const blockCopy = _.cloneDeep(block);
    await addBlock(block);

    expect(_.isEqual(block, blockCopy)).to.equal(true); //check that object hasn't been modified

    const isBlockExists = await models.blockModel.count({_id: block.signature});
    expect(isBlockExists).to.equal(1);
  });

  it('find missed blocks', async () => {

    ctx.blockProcessorPid = spawn('node', ['index.js'], {env: process.env, stdio: 'ignore'});
    await Promise.delay(20000);
    ctx.blockProcessorPid.kill();

    const instance = await providerService.get();
    const height = await instance.getHeight();

    let blocks = [];
    for (let i = 1; i < height - 2; i++)
      blocks.push(i);
    blocks = _.shuffle(blocks);
    const blocksToRemove = _.take(blocks, 50);
    await models.blockModel.remove({number: {$in: blocksToRemove}});

    const buckets = await allocateBlockBuckets();
    expect(buckets.height).to.equal(height - 1);

    let blocksToFetch = [];
    for (let bucket of buckets.missedBuckets) {
      if (bucket.length === 1) {
        blocksToFetch.push(...bucket);
        continue;
      }

      for (let blockNumber = _.last(bucket); blockNumber >= bucket[0]; blockNumber--)
        blocksToFetch.push(blockNumber);
    }

    expect(_.intersection(blocksToFetch, blocksToRemove).length).to.equal(blocksToRemove.length);

  });
  it('add unconfirmed tx', async () => {
    const oldTxRaw = await waitTransaction(sender.sendTransaction.bind(sender, 
        ctx.accounts[0], ctx.accounts[1], 100)
    );
    const oldTx = await addUnconfirmedTx(oldTxRaw);

    const newTxRaw = _.cloneDeep(oldTxRaw);
    newTxRaw.timestamp = Date.now();
    newTxRaw.id = uniqid();
    const newTx = await addUnconfirmedTx(newTxRaw);

    let isTxExists = await models.txModel.count({_id: oldTx.id});
    expect(isTxExists).to.equal(1);

    isTxExists = await models.txModel.count({_id: newTx.id});
    expect(isTxExists).to.equal(1);
  });


  it('check filterTxsByAccountService', async () => {
    const instance = await providerService.get();
    let height = await instance.getHeight();
    let tx = null;

    while(!tx){
      let newHeight = await instance.getHeight();

      for(let i = height; i < newHeight;i++){
        let block = await getBlock(i);
        await addBlock(block);
        tx = await models.txModel.findOne({sender: {$ne: null}});
        height = newHeight;
      }

      await Promise.delay(5000);
    }

    await models.accountModel.create({address: tx.sender});

    let filtered = await filterTxsByAccountService([tx]);
    expect(!!_.find(filtered, {sender: tx.sender})).to.eq(true);


    await models.accountModel.remove();
    filtered = await filterTxsByAccountService([tx]);
    expect(!!_.find(filtered, {sender: tx.sender})).to.eq(false);
  });

};
