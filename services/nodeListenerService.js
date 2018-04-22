/**
 * 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const request = require('request-promise'),
  config = require('../config'),
  {URL} = require('url'),
  _ = require('lodash'),
  bunyan = require('bunyan'),
  Promise = require('bluebird'),
  log = bunyan.createLogger({name: 'app.services.nodeListenerService'}),
  TIMEOUT_WAIT = 1000;


const get = query => makeRequest(query, 'GET');

const makeRequest = (path, method, body, headers = {}) => {
  const options = {
    method,
    body,
    uri: new URL(path, config.node.rpc),
    json: true,
    headers
  };
  return request(options).catch(async (e) => await errorHandler(e));
};


const errorHandler = async (err) => {
  if (err.name && err.name === 'StatusCodeError')
    await Promise.delay(10000);
  log.error(err);
};

/**
 * 
 * @return {Promise return [Object] transactions}
 */
const getUnconfirmedTransactions = async () => {
  return await get('/transactions/unconfirmed');
};



class NodeListenerService {

  constructor () {
    this.parsedTxs = [];
  }

  onlyNew (txs) {
    const txIds = _.map(txs, 'id'),
      newTxIds = _.difference(txIds, this.parsedTxs);

    this.parsedTxs = txIds;
    const newTxs = _.filter(txs, tx => newTxIds.includes(tx.id));
    return newTxs;
  }

  /**
   * 
   * @param {any} callback function (tx)
   * 
   * @memberOf NodeListenerService
   */
  async onMessage (callback) {
    this.intervalListener = setInterval(async () => {
      const txs = this.onlyNew(await getUnconfirmedTransactions());
      await Promise.map(txs, callback);
    }, TIMEOUT_WAIT);
  }


  async stop () {
    clearInterval(this.intervalListener);
  }
}

module.exports = NodeListenerService;
