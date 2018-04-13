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
  const adrs = [];
  if (tx.sender) 
    adrs.push(tx.sender);
  if (tx.recipient) 
    adrs.push(tx.recipient);
  if (tx.transfers)
    _.each(tx.transfers, transfer => adrs.push(transfer.recipient));
  return adrs;
};



module.exports = async txs => {

  const addresses = _.chain(txs)
    .map(tx => getAdrsFromTx(tx))
    .flattenDeep()
    .compact()
    .uniq()
    .value();

  let filteredAccounts = await accountModel.find({
    address: {
      $in: addresses
    },
    isActive: {
      $ne: false
    }
  });
  filteredAccounts = _.chain(filteredAccounts)
    .map(account => account.address)
    .flattenDeep()
    .value();

  return _.chain(txs)
    .filter(tx => {
      return _.find(filteredAccounts, account =>
        getAdrsFromTx(tx).includes(account)
      );
    })
    .value();

};
