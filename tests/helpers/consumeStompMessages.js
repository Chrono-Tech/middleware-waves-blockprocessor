/**
 * 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const config = require('../config');
module.exports = async (maxCount = 1, client, parseMessage) => {
  return new Promise(res  => client.connect('guest', 'guest', () => {
    let messageCount = 1;

    const updateMessage = async(message) => {
      if (messageCount === maxCount) {
        await subscriber.unsubscribe();
        await message.ack();        
        res();
      } else 
        messageCount++;
        await message.ack();
    }

    const subscriber = client.subscribe(`/exchange/events/${config.rabbit.serviceName}_transaction.*`, async (message) => {
      if (parseMessage(message)) {
        await updateMessage(message);
      }
    });
  }));
};
