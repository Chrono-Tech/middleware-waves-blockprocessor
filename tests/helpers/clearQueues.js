/**
 * 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const config = require('../config');

module.exports = async (amqpInstance) => {
  const channel = await amqpInstance.createChannel();
  channel.assertQueue(`app_${config.rabbit.serviceName}_test.transaction`);
  await channel.purgeQueue(`app_${config.rabbit.serviceName}_test.transaction`);
};
