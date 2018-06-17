const models = require('../../models');

module.exports = async () => {
  await models.txModel.remove({
    blockNumber: -1
  });

};
