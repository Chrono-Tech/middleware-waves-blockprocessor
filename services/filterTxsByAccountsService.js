/**
 * 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const _ = require('lodash'),
  accountModel = require('../models/accountModel');

/**
 * @service
 * @description filter txs by registered addresses
 * @param txs - an array of txs
 * @returns {Promise.<*>}
 */

const getAdrsFromTx = (tx) => {
  return _.chain([
    _.get(tx, 'sender', undefined), 
    _.get(tx, 'recipient', undefined), 
    _.map(
      _.get(tx, 'transfers', []), 
      transfer => transfer.recipient
    )
  ])
    .flattenDeep()
    .filter(addr => addr !== undefined)
    .value();
};



module.exports = async txs => {

  const addresses = _.chain(txs)
    .map(tx => getAdrsFromTx(tx))
    .flattenDeep()
    .compact()
    .uniq()
    .value();

  const filteredAccounts = await accountModel.find({
    address: {
      $in: addresses
    },
    isActive: {
      $ne: false
    }
  });
  const filteredAddresses = _.map(filteredAccounts, account => account.address);

  return  _.reduce(txs, (acc, tx) => {
    _.each(
      _.intersection(
        getAdrsFromTx(tx),
        filteredAddresses
      ), 
      address => { acc.push(_.merge(tx, { address })); }
    );
    return acc;
  }, []);
};
