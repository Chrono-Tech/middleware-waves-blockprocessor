


class NodeListenerService {

  /**
   * 
   * 
   * @param {WebSocketAsPromised} wsp 
   * 
   * @memberOf NodeListenerService
   */
  constructor (wsp) {
    this.wsp = wsp;
  }

  /**
   * 
   * @param {any} callback function (tx)
   * 
   * @memberOf NodeListenerService
   */
  async onMessage (callback) {
    await this.wsp.open();
    this.wsp.onMessage.addListener(message => {
      const content = JSON.parse(message);
      if (content.msg && content.msg.sender)
        callback(content.msg);
    });

    await this.wsp.send('{"op":"subscribe utx"}');    
  }


  async stop () {
    await this.wsp.send('{"op":"unseubscribe all"}');
    await this.wsp.close();
  }
}

module.exports = NodeListenerService;
