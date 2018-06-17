/**
 * 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const request = require('request-promise'),
  {URL} = require('url'),
  _ = require('lodash'),
  bunyan = require('bunyan'),
  Promise = require('bluebird'),
  log = bunyan.createLogger({name: 'app.services.nodeListenerService'}),
  TIMEOUT_WAIT = 1000;

/**
 * 
 * @class NodeListenerService
 */
class NodeListenerService {

  constructor (providerService) {
    this.providerService = providerService;
    this.parsedTxs = [];
  }

  onlyNew (txs) {
    const txIds = _.map(txs, 'id'),
      newTxIds = _.difference(txIds, this.parsedTxs);

    this.parsedTxs = txIds;
    const newTxs = _.filter(txs, tx => newTxIds.includes(tx.id));
    return newTxs;
  }

  async start () {
    
  }

  /**
   * 
   * @param {any} callback function (tx)
   * 
   * @memberOf NodeListenerService
   */
  async onMessage (callback) {
    this.intervalListener = setInterval(async () => {
      const txs = this.onlyNew(await this.getUnconfirmedTransactions());
      await Promise.map(txs, callback);
    }, TIMEOUT_WAIT);
  }


  async stop () {
    clearInterval(this.intervalListener);
  }

  get (url) {
    return this.makeRequest(url, 'GET');
  }

  makeRequest (url, method, body) {
    const options = {
      method,
      body,
      uri: url,
      json: true
    };
    return request(options).catch(this.onError.bind(this));
  }

  async onError (err) {
    log.error(err);
    const provider = this.providerService.getProvider();
    this.providerService.disableProvider(provider);
  }

  /**
   * 
   * @return {Promise return [Object] transactions}
   */
  async getUnconfirmedTransactions () {
    const provider = await this.providerService.getProvider();
    return await this.get(
      new URL('/transactions/unconfirmed', provider.getHttp())
    );
  }
}

module.exports = NodeListenerService;
