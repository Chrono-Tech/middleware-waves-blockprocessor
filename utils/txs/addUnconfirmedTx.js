/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const bunyan = require('bunyan'),
  models = require('../../models'),
  log = bunyan.createLogger({name: 'app.utils.addUnconfirmedTx'});

/**
 * @service
 * @description filter txs by registered addresses
 * @param tx - transaction
 * @returns {Promise.<*>}
 */

module.exports = async (tx) => {

  _.merge(tx, {
    blockNumber: -1,
    hash: tx.id,
  });

  log.info(`inserting unconfirmed tx ${tx.hash}`);
  await models.txModel.create(tx);
  return tx;

};
