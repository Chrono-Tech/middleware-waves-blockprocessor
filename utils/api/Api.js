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

    }, 20000);
  }

  stopWatchUnconfirmed() {
    clearInterval(this._watchIntervalId);
    this._watchIntervalId = null;
  }


  async _makeRequest(url, method = 'GET', body) {
    const options = {
      method: method,
      body: body,
      uri: new URL(url, this.http),
      json: true
    };
    return Promise.resolve(request(options)).timeout(10000);
  }

  async getBlockByNumber(height) {
    const block = await this._makeRequest(`blocks/at/${height}`);

    if (!block || !block.height)
      return {};

    return _.merge(block, {
      number: block.height,
      hash: block.signature,
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


}

module.exports = Api;
