const EventEmitter = require('events'),
  Promise = require('bluebird'),
  _ = require('lodash'),
  request = require('request-promise'),
  URL = require('url').URL;

/**
 * @service
 * @param URI - the endpoint URI
 * @description http provider for nem node
 */

class Api extends EventEmitter {

  constructor (URI) {
    super();
    this.http = URI.http;
    this._watchIntervalId = null;
    this._unconfirmedTxs = [];
    this._lastBlockCheck = null;
  }

  /**
   * @function
   * @description watch for unconfirmed txs
   */
  watchUnconfirmed () {

    if (this._watchIntervalId)
      return;

    this._watchIntervalId = setInterval(async () => {
      const height = await this.getHeight();
      if (height !== this._lastBlockCheck)
        this._unconfirmedTxs = [];

      let txs = await this.getUnconfirmedTxs();
      const savedTxIds = _.map(this._unconfirmedTxs, 'id');
      txs = _.reject(txs, tx => savedTxIds.includes(tx.id));
      this._unconfirmedTxs.push(...txs);
      txs.forEach(tx => {
        this.emit('unconfirmedTx', tx);
      });

    }, 10000);
  }

  /**
   * @function
   * @description stop watching for unconfirmed txs
   */
  stopWatchUnconfirmed () {
    clearInterval(this._watchIntervalId);
    this._watchIntervalId = null;
  }

  /**
   * @function
   * @description internal method for making requests
   * @param url - endpoint url
   * @param method - the HTTP method
   * @param body - the body of the request
   * @return {Promise<*>}
   * @private
   */
  async _makeRequest (url, method = 'GET', body) {
    const options = {
      method: method,
      body: body,
      uri: new URL(url, this.http),
      json: true
    };
    return Promise.resolve(request(options)).timeout(10000);
  }

  /**
   * @function
   * @description get block by it's number
   * @param height
   * @return {Promise<{}>}
   */
  async getBlockByNumber (height) {
    const block = await this._makeRequest(`blocks/at/${height}`);

    if (!block || !block.height)
      return null;

    return _.merge(block, {
      number: block.height,
      timestamp: block.time
    });
  }

  /**
   * @function
   * @description get unconfirmed txs
   * @return {Promise<*>}
   */
  async getUnconfirmedTxs () {
    return await this._makeRequest('/transactions/unconfirmed');
  }

  async getTransaction (id) {
    return await this._makeRequest('/transactions/info/{id}');
  }

  /**
   * @function
   * @description get blockchain current height
   * @return {Promise<*>}
   */
  async getHeight () {
    const data = await this._makeRequest('blocks/height');
    return data.height;
  }


}

module.exports = Api;
