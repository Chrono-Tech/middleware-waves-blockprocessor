/** 
* Copyright 2017–2018, LaborX PTY
* Licensed under the AGPL Version 3 license.
* @author Kirill Sergeev <cloudkserg11@gmail.com>
*/
const _ = require('lodash'),
  config = require('../config'),
  Api = require('./api/Api'),
  providerService = require('./services/providerService');

/**
 * @param {Function} sendTransaction
 */
module.exports = async (sendTransaction) => {
  const instance = new Api({http: config.dev.providerForTest});

  let tx; 
  await Promise.all([
    new Promise(res => {
      let intervalPid = setInterval(async () => {
        if (!tx) 
          return; 
        const firstTx= await instance.getTransaction(tx.id).catch(e => {});

        if (firstTx && firstTx.height) {
          clearInterval(intervalPid);
          res();
        }
      }, 1000);
    }),
    (async () => {
      tx = await sendTransaction();
    })()
  ]);
  return tx;
};
