const config = require('../config'),
  request = require('request-promise'),
  URL = require('url').URL;

module.exports = async (call, args, post = false) => {

  return await post ?
    request({
      method: 'POST',
      uri: new URL(call.replace(/\./g, '/'), config.waves.rpc).href,
      body: args,
      json: true
    }) : request({
      uri: new URL(call.replace(/\./g, '/'), config.waves.rpc).href,
      json: true
    });

};
