const blockModel = require('../../models/blockModel'),
  config = require('../../config'),
  RPC = require('../../utils/RPC'),
  _ = require('lodash'),
  Promise = require('bluebird');

module.exports = () => {
  let latestBlock = null;

  return new Promise(res => {
    let check = async () => {
      if (!latestBlock)
        latestBlock = await RPC('blocks.last');

      if(Date.now() - latestBlock.timestamp < 1000 * config.waves.blockGenerationTime)
        await Promise.delay(Date.now() - latestBlock.timestamp);


      let currentBlock = await blockModel.findOne({network: config.waves.network});
      _.get(currentBlock, 'block', 0) >= latestBlock.height ?
        res() : check()
    };
    check();
  });
}