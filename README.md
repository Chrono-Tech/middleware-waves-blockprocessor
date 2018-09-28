# middleware-waves-blockprocessor [![Build Status](https://travis-ci.org/ChronoBank/middleware-waves-blockprocessor.svg?branch=master)](https://travis-ci.org/ChronoBank/middleware-waves-blockprocessor)

Middleware service for handling incoming transactions

### Installation

This module is a part of middleware services. You can install it in 2 ways:

1) through core middleware installer  [middleware installer](https://github.com/ChronoBank/middleware)
2) by hands: just clone the repo, do 'npm install', set your .env - and you are ready to go

#### About
This module is used for watching new blocks and txs for registered on platform users (please, check out - how you can register new user via [rest api](https://github.com/ChronoBank/middleware-waves-rest))).


#### How does it work?

Block processor connects to http endpoint, fetch blocks one by one and cache them in mongodb.

Which txs block processor filter?

Block processor filter txs by specified user accounts (addresses). The addresses are presented in "wavesaccounts" collection with the following format:
```
{
    "_id" : ObjectId("5b2ba7cd6021784c2c258bd0"),
    "address" : "3N2CTeJiaQdRDtW4oixVUr1eJ6khZ8J87fq",
    "created" : ISODate("2018-06-21T13:27:41.651Z"),
    "isActive" : true,
    "balance" : NumberLong(1595900000),
    "assets" : {
        "1231" : {
            "balance" : 12312300,
            "id" : "9TVgpmkFLgesFxBCoZW498MXFQDNHVAAYChvH5EPuY1W",
            "decimals" : 2
        },
        "12111" : {
            "balance" : 1222222222220.0,
            "id" : "9hAjmSYdsMmmtsobDKNbhXtxeWweY1D9qsPz5CPDPxV8",
            "decimals" : 1
        }
    }
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
  type: 4,
  id: 'CChGDzbjnMVCtuNEGs6B4n2ReTwAnDCZun6hTssMeyoP',
  sender: '3JfE6tjeT7PnpuDQKxiVNLn4TJUFhuMaaT5',
  senderPublicKey: 'GbGEY3XVc2ohdv6hQBukVKSTQyqP8rjQ8Kigkj6bL57S',
  fee: 100000,
  timestamp: 1528192093275,
  signature: '48TJPqvoQ5QB6VxpFZ1LCYeda67Tt5cWSnPeG6Wj7VSU3TMbToR4My8C5bukmjkK7pvxJCqQ4tNRj6tAnh3FZBPB',
  recipient: '3Jk2fh8aMBmhCQCkBcUfKBSEEa3pDMkDjCr',
  assetId: null,
  amount: 100,
  feeAsset: null,
  attachment: 'string',
  blockNumber: -1,
  hash: '48TJPqvoQ5QB6VxpFZ1LCYeda67Tt5cWSnPeG6Wj7VSU3TMbToR4My8C5bukmjkK7pvxJCqQ4tNRj6tAnh3FZBPB',
  address: '3JfE6tjeT7PnpuDQKxiVNLn4TJUFhuMaaT5'
}
```

#### Why do we use rabbitmq?


Rabbitmq is used for 2 main reasons - the first one for inner communication between different core modules. And the second one - is for notification purpose. When a new transaction arrives and it satisfies the filter - block processor notiffy others about it though rabbitmq exhange strategy. The exchage is called 'events', and it has different kinds of routing keys. For a new tx the routing key is looked like so:

```
<RABBIT_SERVICE_NAME>_transaction.{address}
```
Where address is to or from address. Also, you can subscribe to all waves_transactions events by using wildcard:
```
<RABBIT_SERVICE_NAME>_transaction.*
```

All in all, in order to be subscribed, you need to do the following:
1) check that exchange 'events' exist
2) assert a new queue (this should be your own unique queue)
3) bind your queue to 'events' exchange with appropriate routing key
4) consume (listen) your queue


But be aware of it - when a new tx arrives, the block processor sends 2 messages for the same one transaction - for both addresses, who participated in transaction (from and to recepients). The sent message represent the payload field from transaction object (by this unique field you can easely fetch the raw transaction from mongodb for your own purpose).

#### cache system
In order to make it possible to work with custom queries (in [rest](https://github.com/ChronoBank/middleware-waves-rest)), or perform any kind of analytic tasks, we have introduced the caching system. This system stores all blocks and txs in mongodb under the specific collections: blocks, txes.

##### wavesblocks
The wavesvblocks collection stores only the most valuable information about the block. Here is the example of block:
```
{
    "_id" : "52qgHfxaWHvbmucyX4ukCXcNHbznZ4EdZwmtc32UM2tzEFYjZ3wddA3y5mM6C9m7oMu542zFXxircZVLq5dpmUkr",
    "blocksize" : 225,
    "created" : ISODate("2018-06-22T06:51:43.116Z"),
    "fee" : NumberLong(0),
    "number" : 364,
    "timestamp" : ISODate("2018-06-22T06:49:42.013Z"),
    "version" : 3
}
```

Here is the description:

| field name | index | description|
| ------ | ------ | ------ |
| _id   | true | the signature of block
| blocksize | false | size of block
| created | false | date, when block has been cached by middleware
| fee | false | total fee for block
| number | true | block number
| hash | true | signature of block
| timestamp | true | date, when block has been in blockchain
| version | false | version (0x02 for Genesis block,, 0x03 for common block)


##### wavestxes
The wavestxes collection stores only the most valuable information about the transaction. Here is the example of transaction:
```
    "_id" : "3Z5Y5Dd6wPxYpSEj9N85bkEFpyNF9gcef4yX7Wj9ZKgmYCRDfkSqUSUyyEcHEvEMG54wwvBxEQ3tqQJLjB614rJW",
    "amount" : NumberLong(4215000000000000),
    "blockNumber" : 1,
    "data" : [],
    "fee" : NumberLong(0),
    "recipient" : "3JuJRCEthv5KFLpWa1abtMDKAJSeviE2dEe",
    "timestamp" : 1500635421931.0,
    "transfers" : [],
    "type" : 1
```

Here is the description:

| field name | index | description|
| ------ | ------ | ------ |
| _id   | true | the signature of transnaction
| blockNumber   | true | the block number
| timestamp   | true | timestamp
| amount   | false | amount
| quantity   | false | quantity
| decimals | false | decimals of asset
| type | false | type of transaction
| recipient | true | address of recipient
| sender | true |  address of recipient
| assetId | false | asset id
| description | false | the asset description
| feeAsset | false | fee of asset
| attachment | false | attachment
| alias | false | asset alias
| transferCount | false | transfer count
| totalAmount | false | total transfer amount
| script | false | the tx script
| fee | false | fee
| minSponsoredAssetFee | false | minimum sponsor fee for asset
| order1.sender | true | sender of order
| order1.assetPair.amountAsset | false | asset amount
| order1.assetPair.priceAsset | false |asset price
| order1.orderType | false | type of order
| order1.price | false | order price
| order1.amount | false | order amount
| order1.timestamp | false | timestamp
| order1.expiration | false | expiration timestamp
| order1.matcherFee | false | fee
| order1.signature | false | signature
| order2.sender | true | sender of order
| order2.assetPair.amountAsset | false | asset amount
| order2.assetPair.priceAsset | false |asset price
| order2.orderType | false | type of order
| order2.price | false | order price
| order2.amount | false | order amount
| order2.timestamp | false | timestamp
| order2.expiration | false | expiration timestamp
| order2.matcherFee | false | fee
| order2.signature | false | signature
| transfers[].recipient | true | address of transfers recipient
| transfers[].amount | false | amount of transfer
| lease.type | false | the type of lease
| lease.sender | true | sender address
| lease.fee | false | fee
| lease.timestamp | false | timestamp
| lease.signature | false | signature
| lease.amount | false | amount
| lease.recipient | false | recipient address
| data[].key | false | the key (alias name)
| data[].type | false | type of data
| data[].value | false | value

### supported networks

The actual network could be set with NETWORK param. All supported networks are presented below:

| name | description|
| ------ | ------ |
| main   | waves mainnet
| testnet   | waves testnet



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
PROVIDERS=http://localhost:6869,http://testnode1.wavesnodes.com:6869
BLOCK_GENERATION_TIME=60000
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
| PROVIDERS   | the paths to http endpoints, written with comma sign
| BLOCK_GENERATION_TIME   | the time, at which microblocks are going to be included in main block (or the network time, when block should be mined)
| SYSTEM_RABBIT_URI   | rabbitmq URI connection string for infrastructure
| SYSTEM_RABBIT_SERVICE_NAME   | rabbitmq service name for infrastructure
| SYSTEM_RABBIT_EXCHANGE   | rabbitmq exchange name for infrastructure
| CHECK_SYSTEM | check infrastructure or not (default = true)
----
 [GNU AGPLv3](LICENSE)

Copyright
----
LaborX PTY
