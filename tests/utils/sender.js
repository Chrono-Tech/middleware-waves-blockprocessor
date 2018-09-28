/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */
const providerService = require('./services/providerService'),
  config = require('../config');
  
let instance;
const getInstance = async () => {
  if (!instance)
    instance = await providerService.get();
  return instance;
};
module.exports = {

  sendTransaction: async (from, to, amount) => {
    const instance = await getInstance();
    const tx = await instance.signTransaction(config.dev.apiKey, to, amount, from); 
    return await instance.sendTransaction(config.dev.apiKey, tx); 
  }
};
