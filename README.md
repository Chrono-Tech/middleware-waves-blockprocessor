# middleware-waves-blockprocessor [![Build Status](https://travis-ci.org/ChronoBank/middleware-waves-blockprocessor.svg?branch=master)](https://travis-ci.org/ChronoBank/middleware-waves-blockprocessor)

Middleware service for handling incoming transactions

### Installation

This module is a part of middleware services. You can install it in 2 ways:

1) through core middleware installer  [middleware installer](https://github.com/ChronoBank/middleware)
2) by hands: just clone the repo, do 'npm install', set your .env - and you are ready to go

#### About
This module is used for watching new blocks and txs for registered on platform users (please, check out - how you can register new user via [rest api](https://github.com/ChronoBank/middleware-waves-rest))).


#### How does it work?

Block processor connects to http node, fetch blocks one by one and cache them in mongodb.

Which txs block processor filter?

Block processor filter txs by specified user accounts (addresses). The addresses are presented in "wavesaccounts" collection with the following format:
```
{
    "_id" : ObjectId("599fd82bb9c86c7b74cc809c"),
    "address" : "0x1cc5ceebda535987a4800062f67b9b78be0ef419",
    "balance" : 0.0,
    "created" : 1503647787853,
    "isActive": true,
    "assets": ["0x1cc5ceebda5359": 0.0]
}
```

So, when someone, for instance do a transaction (sample from test example):
```
/* 
* fromAddress - "3JfE6tjeT7PnpuDQKxiVNLn4TJUFhuMaaT5"
* toAddress - "3Jk2fh8aMBmhCQCkBcUfKBSEEa3pDMkDjCr"
* X-API-KEY - 'password'(in waves-devnet.conf)
* host - localhost:6869 
*/
const request = require('request-promise')
const tx = await request({
    method: 'POST',
    body: {
        type: 4,
        sender: fromAddress,
        recipient: toAddress,
        amount: 200,
        fee: 100000,
        attachment: 'string'
    },
    uri: host . 'transactions/sign',
    json: true,
    headers: {'X-API-Key': apiKey}
 })
 await request({
    method: 'POST',
    body: tx,    
    uri: host . 'transactions/broadcast',
    json: true,
    headers: {'X-API-Key': apiKey}
 })
```

this tx is going to be included in next blocks. Block parser fetch these blocks, and filter by "recipient" and "sender" recipients.
If one of them is presented in wavesaccounts collection in mongo, then this transaction will be broadcasted via rabbitmq.

```
{
    "hash" : "0xb432ff1b436ab7f2e6f611f6a52d3a44492c176e1eb5211ad31e21313d4a274f", //or id in block waves
    "signature" : "0xb432ff1b436ab7f2e6f611f6a52d3a44492c176e1eb5211ad31e21313d4a274f",
    "timeStamp": ISODate("2017-08-25T08:04:57.389Z"),
    "hash": "0x1cc5ceebda535987a4800062f67b9b78be0ef419",
    "type": "10",
    "assetId": "LLLLL",
    "feeAsset": "20.0",
    "attachment": "dsfsdfsd",
    sender: "0x1cc5ceebda535987a4800062f67b9b78be0ef419",
    senderPublicKey: "0x1cc5ceebda535987a4800062f67b9b78be0ef419",
    recipient: "0x1cc5ceebda535987a4800062f67b9b78be0ef419",
    fee: "21.0",
    amount: 100,    

    transfers: [{
      recipient: "0x1cc5ceebda535987a4800062f67b9b78be0ef419",
      amount: 10
    }]
}
```

Why do we use rabbitmq?


Rabbitmq is used for 2 main reasons - the first one for inner communication between different core modules. And the second one - is for notification purpose. When a new transaction arrives and it satisfies the filter - block processor notiffy others about it though rabbitmq exhange strategy. The exchage is called 'events', and it has different kinds of routing keys. For a new tx the routing key is looked like so:

```
<RABBIT_SERVICE_NAME>_transaction.{address}
```
Where address is to or from address. Also, you can subscribe to all waves_transactions events by using wildcard:
```
<RABBIT_SERVICE_NAME>_transaction.*
```

All in all, in order to be subscribed, you need to do the following:
1) check that exchange 'events exist'
2) assert a new queue (this should be your own unique queue)
3) bind your queue to 'events' exchange with appropriate routing key
4) consume (listen) your queue


But be aware of it - when a new tx arrives, the block processor sends 2 messages for the same one transaction - for both addresses, who participated in transaction (from and to recepients). The sent message represent the payload field from transaction object (by this unique field you can easely fetch the raw transaction from mongodb for your own purpose).



##### сonfigure your .env

To apply your configuration, create a .env file in root folder of repo (in case it's not present already).
Below is the expamle configuration:

```
MONGO_ACCOUNTS_URI=mongodb://localhost:27017/data
MONGO_ACCOUNTS_COLLECTION_PREFIX=waves

MONGO_DATA_URI=mongodb://localhost:27017/data
MONGO_DATA_COLLECTION_PREFIX=waves

RABBIT_URI=amqp://localhost:5672
RABBIT_SERVICE_NAME=app_waves
NETWORK=development

SYNC_SHADOW=1
RPC=http://localhost:6869
```

The options are presented below:

| name | description|
| ------ | ------ |
| MONGO_URI   | the URI string for mongo connection
| MONGO_COLLECTION_PREFIX   | the default prefix for all mongo collections. The default value is 'waves'
| MONGO_ACCOUNTS_URI   | the URI string for mongo connection, which holds users accounts (if not specified, then default MONGO_URI connection will be used)
| MONGO_ACCOUNTS_COLLECTION_PREFIX   | the collection prefix for accounts collection in mongo (If not specified, then the default MONGO_COLLECTION_PREFIX will be used)
| MONGO_DATA_URI   | the URI string for mongo connection, which holds data collections (for instance, processed block's height). In case, it's not specified, then default MONGO_URI connection will be used)
| MONGO_DATA_COLLECTION_PREFIX   | the collection prefix for data collections in mongo (If not specified, then the default MONGO_COLLECTION_PREFIX will be used)
| RABBIT_URI   | rabbitmq URI connection string
| RABBIT_SERVICE_NAME   | namespace for all rabbitmq queues, like 'app_waves_transaction'
| NETWORK   | network name (alias)- is used for connecting via http node (see block processor section)
| SYNC_SHADOW   | sync blocks in background
| RPC | rpc path for node waves api 
| BLOCK_GENERATION_TIME | generation time for block

License
----
 [GNU AGPLv3](LICENSE)

Copyright
----
LaborX PTY
