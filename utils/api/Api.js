const EventEmitter = require('events'),
  Promise = require('bluebird'),
  _ = require('lodash'),
  request = require('request-promise'),
  URL = require('url').URL;

class Api {

  constructor (URI) {
    this.http = URI.http;
    this.events = new EventEmitter();
  }

  async _makeRequest (url, method = 'GET', body) {
    const options = {
      method: method,
      body: body,
      uri: new URL(url, this.http),
      json: true
    };
    return Promise.resolve(request(options)).timeout(10000);
  }

  async getBlockByNumber (height) {
    const block = await this._makeRequest(`blocks/at/${height}`);

    if (!block || !block.height)
      return {};

    return _.merge(block, {
      number: block.height,
      hash: block.signature,
      timestamp: block.time
    });
  }


  async getHeight () {
    const data = await this._makeRequest('blocks/height');
    return data.height;
  }


}

module.exports = Api;
