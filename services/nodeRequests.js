const request = require('request-promise'),
  config = require('../config'),
  _ = require('lodash'),
  {URL} = require('url'),
  bunyan = require('bunyan'),
  Promise = require('bluebird'),
  log = bunyan.createLogger({name: 'wavesBlockprocessor.nodeSenderService'});




const get = query => makeRequest(query, 'GET');
const privatePost = (query, body, apiKey) => makeRequest(query, 'POST', body, {
  'X-API-Key': apiKey
});


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


/**
 * 
 * @param {String} apiKey 
 * @param {String} toAddress 
 * @param {Number} amount 
 * @param {String} fromAddress 
 * @return {Promise return Object}
 */
const signTransaction = async (apiKey, toAddress, amount, fromAddress) => {
  return await privatePost('transactions/sign', {
    type: 4,
    sender: fromAddress,
    recipient: toAddress,
    amount: amount,
    fee: 100000,
    attachment: 'string'
  }, apiKey);
};

/**
 * only for test
 * @param {String} apiKey 
 * @param {Object} tx 
 * @return {Promise}
 */
const sendTransaction = async (apiKey, tx) => {
  return await privatePost('transactions/broadcast', tx, apiKey);
};


module.exports = {
  getBlockByNumber,
  getBlocksByNumbers,
  getLastBlockNumber,

  //for tests only
  signTransaction,
  sendTransaction,
};
