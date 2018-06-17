/**
 *
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const _ = require('lodash'),
  models = require('../models');

/**
 * @service
 * @description filter txs by registered addresses
 * @param txs - an array of txs
 * @returns {Promise.<*>}
 */

const getAddrsFromTx = (tx) => {
  return _.chain([
    _.get(tx, 'sender'),
    _.get(tx, 'recipient'),
    _.map(
      _.get(tx, 'transfers', []),
      transfer => transfer.recipient
    )
  ])
    .flattenDeep()
    .compact()
    .value();
};


module.exports = async txs => {

  const addresses = _.chain(txs)
    .map(tx => getAddrsFromTx(tx))
    .flattenDeep()
    .compact()
    .uniq()
    .value();

  const filteredAccounts = await models.accountModel.find({
    address: {
      $in: addresses
    },
    isActive: {
      $ne: false
    }
  });
  const filteredAddresses = _.map(filteredAccounts, account => account.address);

  return _.reduce(txs, (acc, tx) => {
    _.each(
      _.intersection(
        getAddrsFromTx(tx),
        filteredAddresses
      ),
      address => {
        acc.push(_.merge(tx, {address}));
      }
    );
    return acc;
  }, []);
};
