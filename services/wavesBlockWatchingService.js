/**
 * 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const BlockWatchingService = require('../shared/services/blockWatchingService');

class WavesBlockWatchingService extends BlockWatchingService
{

  async checkLastSavedBlock (prevNumber) {
    const block =  await this.requests.getBlockByNumber(prevNumber);
    if (block && block.hash !== undefined && block.hash !== this.lastBlocks[0]) { //heads are equal
      this.currentHeight--;
      this.lastBlocks.splice(0, 1);
    }
  }

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
    const block =  await this.requests.getBlockByNumber(number);
    if (!block || block.hash === undefined) 
      await this.checkLastSavedBlock(number-1);
    
    return block;        
  }
}


module.exports = WavesBlockWatchingService;
