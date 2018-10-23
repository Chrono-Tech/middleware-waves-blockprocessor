/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const bunyan = require('bunyan'),
  models = require('../../models'),
  config = require('../../config'),
  log = bunyan.createLogger({name: 'utils.txs.addUnconfirmedTx', level: config.logs.level});

/**
 * @function
 * @description add unconfirmed tx to cache
 * @param tx - unconfirmed transaction
 * @returns {Promise.<*>}
 */

module.exports = async (tx) => {

  const toSaveTX = (new models.txModel(tx)).toObject();
  toSaveTX._id = tx.id;

  log.info(`inserting unconfirmed tx ${tx.id}`);
  await models.txModel.create(toSaveTX);
  return tx;

};
