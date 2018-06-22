const EventEmitter = require('events'),
  Promise = require('bluebird'),
  _ = require('lodash'),
  request = require('request-promise'),
  URL = require('url').URL;

class Api {

  constructor(URI) {
    this.http = URI.http;
    this.events = new EventEmitter();
    this._watchIntervalId = null;
    this._unconfirmedTxs = [];
    this._lastBlockCheck = null;
  }

  watchUnconfirmed() {

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
        this.events.emit('unconfirmedTx', tx);
      });

    }, 10000);
  }

  stopWatchUnconfirmed() {
    clearInterval(this._watchIntervalId);
    this._watchIntervalId = null;
  }


  async _makeRequest(url, method = 'GET', body, headers = {}) {
    const options = {
      method: method,
      body: body,
      uri: new URL(url, this.http),
      json: true,
      headers: headers
    };
    return Promise.resolve(request(options)).timeout(10000);
  }

  async getBlockByNumber(height) {
    const block = await this._makeRequest(`blocks/at/${height}`);

    if (!block || !block.height)
      return {};

    return _.merge(block, {
      number: block.height,
      timestamp: block.time
    });
  }

  async getUnconfirmedTxs() {
    return await this._makeRequest('/transactions/unconfirmed');
  }


  async getHeight() {
    const data = await this._makeRequest('blocks/height');
    return data.height;
  }


  /**
   *
   * @param {String} apiKey
   * @param {String} toAddress
   * @param {Number} amount
   * @param {String} fromAddress
   * @return {Promise return Object}
   */
  async signTransaction(apiKey, toAddress, amount, fromAddress) {
    return await this._makeRequest('transactions/sign', 'POST', {
      type: 4,
      sender: fromAddress,
      recipient: toAddress,
      amount: amount,
      fee: 100000,
      attachment: 'string'
    }, {
      'X-API-Key': apiKey
    });
  };

  /**
   * only for test
   * @param {String} apiKey
   * @param {Object} tx
   * @return {Promise}
   */
  async sendTransaction(apiKey, tx) {
    return await this._makeRequest('transactions/broadcast', 'POST', tx, {
      'X-API-Key': apiKey
    });
  };

  /**
   *
   * @param {String} apiKey
   * @param {String} name
   * @param {String} description
   * @param {String} sender
   * @param {Number} fee
   * @param {Number} decimals
   * @param {Number} quantity
   * @param {boolean} reissuable
   * @return {Promise return transaction Object}
   */
  async signIssueTransaction(apiKey, name, description, sender, fee, decimals, quantity, reissuable) {
    let tx = {
      name,
      description,
      sender,
      fee,
      decimals,
      quantity,
      reissuable,
      timestamp: Date.now()
    };
    return await this._makeRequest('assets/issue', 'POST', tx, {
      'X-API-Key': apiKey
    });
  }


  /**
   * only for test
   * @param {String} apiKey
   * @param {String} toAddress
   * @param {Number} amount
   * @param {String} fromAddress
   * @param {String} assetId
   * @return {Promise return Object}
   */
  async signAssetTransaction(apiKey, toAddress, amount, fromAddress, assetId) {
    return await this._makeRequest('assets/transfer', 'POST', {
      assetId,
      sender: fromAddress,
      recipient: toAddress,

      amount: amount,
      fee: 100000,
      attachment: 'string'
    }, {
      'X-API-Key': apiKey
    });
  }

  /**
   * @param {String} apiKey
   * @param {Object} tx
   * @return {Promise}
   */
  async sendAssetTransaction(apiKey, tx) {
    return await this._makeRequest('assets/broadcast/transfer', 'POST', tx, {
      'X-API-Key': apiKey
    });
  }

  /**
   *
   * @param {String} apiKey
   * @param {Object} tx
   * @return {Promise return Object}
   */
  async sendIssueTransaction(apiKey, tx) {
    return await this._makeRequest('assets/broadcast/issue', 'POST', tx, {
      'X-API-Key': apiKey
    });
  }


  async getBalanceByAddressAndAsset(address, assetId) {
    const result = await this._makeRequest(`/assets/balance/${address}/${assetId}`);
    return _.get(result, 'balance', null);
  };


}

module.exports = Api;
