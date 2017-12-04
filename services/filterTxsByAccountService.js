/**
 * Transaction filter
 * @module services/filterTxsByAccount
 * @requires models/accountModel
 */

const _ = require('lodash'),
  accountModel = require('../models/accountModel');

module.exports = async (txs) => {
  let query = {
    address: {
      $in: _.chain(txs)
        .map(tx => [tx.sender, tx.recipient])
        .flattenDeep()
        .uniq()
        .value()
    }
  };

  let accounts = await accountModel.find(query);

  accounts = _.chain(accounts)
    .map(account => account.address)
    .flattenDeep()
    .value();

  return _.chain(txs)
    .filter(tx =>
      _.find(accounts, account =>
        [tx.sender, tx.recipient].includes(account)
      )
    )
    .value();
};
