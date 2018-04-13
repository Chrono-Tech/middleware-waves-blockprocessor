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


const getLastBlockNumber = async () => {
  const result = await get('/blocks/height');
  return ((result.height && result.height > 0) ? result.height : 0);
};

const getBlockByNumber = async (height) => {
  const block = await get(`/blocks/at/${height}`);
  return createBlock(block); 
};
const getBlocksByHashes = async (hashes) => {
  const blocks = await Promise.map(hashes, 
    async blockHash => await get(`blocks/signature/${blockHash}`).catch(() => null)
  );
  return _.chain(blocks).filter(block => block && block.signature !== undefined)
    .map(createBlock).value();
};



const getAccount = async (address) => await get(`/account/get?address=${address}`);
const getUnconfirmedTransactions = async (address) => await get(`/account/unconfirmedTransactions?address=${address}`);
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

const sendTransaction = async (apiKey, tx) => {
  return await privatePost('transactions/broadcast', tx, apiKey);
};


module.exports = {
  getAccount,
  getUnconfirmedTransactions,
  signTransaction,
  sendTransaction,

  getBlockByNumber,
  getBlocksByHashes,
  getLastBlockNumber
};
