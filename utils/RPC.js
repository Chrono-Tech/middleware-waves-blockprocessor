const _ = require('lodash'),
  config = require('../config'),
  request = require('request-promise'),
  URL = require('url').URL;

module.exports = async (call, args, post = false) => {

  return await post ?
    request({
      method: 'POST',
      uri: config.waves.rpc,
      body: args,
      json: true
    }) : request({
      uri: new URL(call.replace(/\./g, '/'), config.waves.rpc).href,
      json: true
    });

};
