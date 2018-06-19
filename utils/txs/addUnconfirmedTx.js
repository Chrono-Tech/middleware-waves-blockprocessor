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

  const toSaveTX = {
    _id: tx.signature,
    blockNumber: tx.blockNumber,
    timestamp: tx.timestamp,
    amount: tx.amount,
    type: tx.type,
    recipient: tx.recipient,
    sender: tx.sender,
    assetId: tx.assetId,
    feeAsset: tx.feeAsset,
    attachment: tx.attachment,
    fee: tx.fee,
    transfers: tx.transfers
  };

  log.info(`inserting unconfirmed tx ${tx.signature}`);
  await models.txModel.create(toSaveTX);
  return tx;

};
