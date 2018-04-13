/**
 * 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const request = require('request-promise'),
  config = require('../config'),
  _ = require('lodash'),
  {URL} = require('url'),
  bunyan = require('bunyan'),
  Promise = require('bluebird'),
  log = bunyan.createLogger({name: 'app.services.nodeSenderService'});


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


const createBlock = (block) => {
  return _.merge(block, {
    hash: block.signature
  });
};

const errorHandler = async (err) => {
  if (err.name && err.name === 'StatusCodeError')
    await Promise.delay(10000);
  log.error(err);
};


/**
 * @return {Promise return Number}
 */
const getLastBlockNumber = async () => {
  const result = await get('/blocks/height');
  return ((result.height && result.height > 0) ? result.height : 0);
};

/**
 * 
 * @param {Number} height 
 * @return {Promise return Object}
 */
const getBlockByNumber = async (height) => {
  const block = await get(`/blocks/at/${height}`);
  return createBlock(block); 
};

/**
 * 
 * @param {Array of Number} numbers 
 * @return {Promise return Object[]}
 */
const getBlocksByNumbers = async (numbers) => {
  const blocks = await Promise.map(numbers,
    async blockNumber => await getBlockByNumber(blockNumber).catch(() => {}) 
  );
  return _.chain(blocks).filter(block => block && block.signature !== undefined)
    .value();
};



module.exports = {
  getBlockByNumber,
  getBlocksByNumbers,
  getLastBlockNumber
};
