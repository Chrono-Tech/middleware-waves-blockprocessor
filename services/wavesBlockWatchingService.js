/**
 * 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const BlockWatchingService = require('../shared/services/blockWatchingService');
class WavesBlockWatchingService extends BlockWatchingService
{

  /**
   * 
   * rewrite parent method
   * 
   * @param {any} number 
   * @returns 
   * 
   * @memberOf WavesBlockWatchingService
   */
  async getNewBlock (number) {
    const lastNumber = await this.requests.getLastBlockNumber();
    if (number <= lastNumber) 
      return  await this.requests.getBlockByNumber(number);
    return {};
  }
}


module.exports = WavesBlockWatchingService;
