/**
 * 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const request = require('request-promise'),
  _ = require('lodash'),
  {URL} = require('url'),
  Promise = require('bluebird');

const EMPTY_HEIGHT = -1;

const get = (url) => {
  return makeRequest(url, 'GET');
};

const makeRequest = (url, method, body, headers = {}) => {
  const options = {
    method,
    body,
    uri: url,
    json: true,
    headers
  };
  return request(options);
};

const createUrl = (providerUri, path) => {
  return new URL(path, providerUri);
};

/**
 * @param {String} providerUri
 * @return {Promise return Number}
 */
const getHeightForProvider = async (providerUri) => {
  const result = await new Promise(async res => {
    res(await get(createUrl(providerUri, '/blocks/height')).catch(() => {}));
  }).timeout(10000).catch(()=> {});
  return ((result.height && result.height > 0) ? result.height : EMPTY_HEIGHT);
};



/**
 * 
 * @param {ProviderService} providerService 
 * @return {Object with functions}
 */
const createInstance = (providerService) => {
  
  const createProviderUrl = async (path) => {
    const provider = await providerService.getProvider();
    return createUrl(provider.getHttp(), path);
  };

  const getInstance = async (path, body) => {
    const providerUrl = await createProviderUrl(path);
    return await makeRequest(providerUrl, 'GET', body);
  };

  return {
    /**
     * @param {Object} block 
     * @returns {Object}
     */
    createBlock (block) {
      if (!block.height) 
        return {};
      return _.merge(block, {
        hash: block.signature
      });
    },
    
    /**
     * 
     * @param {Number} height 
     * @return {Promise return Object}
     */
    async getBlockByNumber (height) {
      const block = await getInstance(`/blocks/at/${height}`)
        .catch(async () => {
          await this.onError();
          return {};
        });

      if (!block.height) 
        return {};
      return this.createBlock(block); 
    },

    /**
     * @return {Promise return Number}
     */
    async getLastBlockNumber () {
      const provider = await providerService.getProvider();
      return await getHeightForProvider(provider.getHttp());
    },

    async onError () {
      const provider = await providerService.getProvider();
      providerService.disableProvider(provider);
      await providerService.selectProvider();
    },
    
    
    
    /**
     * 
     * @param {Array of Number} numbers 
     * @return {Promise return Object[]}
     */
    async getBlocksByNumbers (numbers) {
      return _.filter(
        await Promise.map(numbers, 
          async (number) => await this.getBlockByNumber(number)
        ), 
        block => block.signature !== undefined
      );
    }
  };
};




module.exports = {
  getHeightForProvider,
  createInstance
};
