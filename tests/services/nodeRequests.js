/**
 * 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const requests = require('../../services/nodeRequests'),
  _ = require('lodash'),
  request = require('request-promise'),
  config = require('../config'),
  {URL} = require('url'),
  bunyan = require('bunyan'),
  Promise = require('bluebird'),
  log = bunyan.createLogger({name: 'app.services.nodeSenderService'});

const privatePost = (query, body, apiKey) => makeRequest(query, 'POST', body, {
  'X-API-Key': apiKey
});

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
const signIssueTransaction = async (apiKey, name, description, sender, fee, decimals, quantity, reissuable) => {
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
  return await privatePost('assets/issue', tx, apiKey);
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
const signAssetTransaction = async (apiKey, toAddress, amount, fromAddress, assetId) => {
  return await privatePost('assets/transfer', {
      assetId,
      sender: fromAddress,
      recipient: toAddress,

      amount: amount,
      fee: 100000,
      attachment: 'string'
    }, apiKey);
}

/**
 * @param {String} apiKey
 * @param {Object} tx
 * @return {Promise}
 */
const sendAssetTransaction = async (apiKey, tx) => {
  return await privatePost('assets/broadcast/transfer', tx, apiKey);
}

/**
 * 
 * @param {String} apiKey 
 * @param {Object} tx
 * @return {Promise return Object}
 */
const sendIssueTransaction = async (apiKey, tx) => {
  return await privatePost('assets/broadcast/issue', tx, apiKey);
}


const getBalanceByAddressAndAsset = async (address, assetId) => {
  const result = await get(`/assets/balance/${address}/${assetId}`);
  return _.get(result, 'balance', null);
};


module.exports = _.merge(requests, {

  signIssueTransaction,
  sendIssueTransaction,
  signAssetTransaction,
  sendAssetTransaction,

  getBalanceByAddressAndAsset,

  //for tests only
  signTransaction,
  sendTransaction
});
