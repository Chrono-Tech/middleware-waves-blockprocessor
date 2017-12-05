const blockModel = require('../../models/blockModel'),
  config = require('../../config'),
  RPC = require('../../utils/RPC'),
  _ = require('lodash'),
  Promise = require('bluebird');

module.exports = () =>
  new Promise(res => {
    let check = async () => {
      let latestBlock = (await RPC('blocks.height')).height;
      await Promise.delay(1000);
      let currentBlock = await blockModel.findOne({network: config.waves.network});
      _.get(currentBlock, 'block', 0) > latestBlock - 10 ?
        res() : check()
    };
    check();
  });