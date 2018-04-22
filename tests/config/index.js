/**
 * 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const config = require('../../config');


config['dev'] = {
  'apiKey': 'password',
  providerForTest: process.env.PROVIDER_FOR_TEST || 'http://localhost:6869',
  'accounts':  [
    '3JfE6tjeT7PnpuDQKxiVNLn4TJUFhuMaaT5',
    '3Jk2fh8aMBmhCQCkBcUfKBSEEa3pDMkDjCr'
  ]
};

module.exports = config;