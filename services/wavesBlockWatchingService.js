/**
 * 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const _ = require('lodash');
const BlockWatchingService = require('../shared/services/blockWatchingService');
class WavesBlockWatchingService extends BlockWatchingService
{


  constructor (requests, listener, repo, currentHeight) {
    super(requests, listener, repo, currentHeight);

    this.events.on('block', (block) => {
      this.prevBlockHash = block.hash;
    });
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
    const blockHeight = await this.requests.getLastBlockNumber();
    if (number <= blockHeight) {
      const block =   await this.requests.getBlockByNumber(number);
      return block;      
    }

    const block = await this.requests.getBlockByNumber(blockHeight);
    if (block.signature !== this.prevBlockHash) {
      this.currentHeight = blockHeight;
      _.pullAt(this.lastBlocks, this.lastBlocks.length-1);
      return block;
    } 
    return {};
    
  }
}


module.exports = WavesBlockWatchingService;
