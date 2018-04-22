/**
 * 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const accountModel = require('../../models/accountModel'),
  blockModel = require('../../models/blockModel');
  txModel = require('../../models/txModel');


module.exports =  async function () {
  await accountModel.remove();
  await txModel.remove();
  await blockModel.remove();
};
