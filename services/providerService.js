/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const bunyan = require('bunyan'),
  config = require('../config'),
  Api = require('../utils/api/Api'),
  sem = require('semaphore')(1),
  providerServiceInterface = require('middleware-common-components/interfaces/blockProcessor/providerServiceInterface'),
  Promise = require('bluebird'),
  EventEmitter = require('events'),
  log = bunyan.createLogger({name: 'app.services.providerService'});

/**
 * @service
 * @description filter txs by registered addresses
 * @param block - an array of txs
 * @returns {Promise.<*>}
 */

class providerService {

  constructor() {
    this.events = new EventEmitter();
    this.connector = null;

    if (config.node.providers.length > 1)
      this.findBestNodeInterval = setInterval(() => {
        this.switchConnectorSafe();
      }, 60000 * 5);
  }

  async resetConnector() {
    this.switchConnector();
    this.events.emit('disconnected');
  }

  async switchConnector() {

    const providerURI = await Promise.any(config.node.providers.map(async providerURI => {
      const apiProvider = new Api(providerURI);
      await apiProvider.getHeight();
      return providerURI;
    })).catch((e) => {
      console.log(e);
      log.error('no available connection!');
      process.exit(0);
    });

    if (this.connector && this.connector.http === providerURI.http)
      return;

    this.connector = new Api(providerURI);
    this.connector.events.on('disconnect', () => this.resetConnector());

    this.pingIntervalId = setInterval(async () => {

      const isConnected = await this.connector.getHeight().catch(() => false);

      if (isConnected === false) {
        clearInterval(this.pingIntervalId);
        this.resetConnector();
      }
    }, 5000);


    await this.connector.watchUnconfirmed();

    this.connector.events.on('unconfirmedTx', tx => {
      this.events.emit('unconfirmedTx', tx);
    });


    return this.connector;

  }

  async switchConnectorSafe() {

    return new Promise(res => {
      sem.take(async () => {
        await this.switchConnector();
        res(this.connector);
        sem.leave();
      });
    });
  }

  async get() {
    return this.connector || await this.switchConnectorSafe();
  }

}

module.exports = providerServiceInterface(new providerService());
