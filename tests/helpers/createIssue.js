/**
 * 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const providerService = require('../services/providerService'),
  Promise = require('bluebird'),
  config = require('../config');


module.exports = async (name, sender) => {

  const provider = await providerService.get();

  const tx = await provider.signIssueTransaction(config.dev.apiKey, name, name, sender,
    100000000, 3, 10000000, false);
  await provider.sendIssueTransaction(config.dev.apiKey, tx);
  await new Promise(res => {
    const check = async () => {
      const initBalance = await provider.getBalanceByAddressAndAsset(sender, tx.assetId);
      if (initBalance > 0) 
        return res();
      else {
        await Promise.delay(3000);
        return check();
      }
    };
    check();
  });
  return tx.assetId;
};
