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
module.exports = async () => {
  const instance = new Api({http: config.dev.providerForTest});

  let block = await instance.getHeight(); 
  await new Promise(res => {
    let intervalPid = setInterval(async () => {
    const blockTwo = await instance.getHeight(); 
    if (blockTwo > block) {
        clearInterval(intervalPid);
        res();
    }
    }, 1000);
  });
};
