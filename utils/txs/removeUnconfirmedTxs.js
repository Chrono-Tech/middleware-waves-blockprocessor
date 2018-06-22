const models = require('../../models');

/**
 * @function
 * @description remove unconfirmed transactions, which has been pulled from mempool
 * @return {Promise<void>}
 */
module.exports = async () => {
  await models.txModel.remove({
    blockNumber: -1
  });

};
