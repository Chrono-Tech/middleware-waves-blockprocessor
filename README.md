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
    "_id" : ObjectId("599fd82bb9c86c7b74cc809c"),
    "address" : "0x1cc5ceebda535987a4800062f67b9b78be0ef419",
    "balance" : 0.0,
    "created" : 1503647787853,
    "isActive": true,
    "assets": ["0x1cc5ceebda5359": 0.0]
}
```

So, when someone, for instance do a transaction (sample from stomp client):
```
/* waves.accounts[0] - "0x1cc5ceebda535987a4800062f67b9b78be0ef419" */
waves.sendTransaction({sender: waves.accounts[0], recipient: waves.accounts[1], value: 200})
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
    "_id" : ObjectId("5ac0e9dca17b00e07504b379"),
    "number" : 876,
    "__v" : 0,
    "blocksize" : "225",
    "fee" : "0",
    "generator" : "3JfE6tjeT7PnpuDQKxiVNLn4TJUFhuMaaT5",
    "hash" : "2Sfxs38ST2M5g6FWTrzNSKUWMjS1woZM92nNHthTrrX6xQgRPrNfq5vqcjSF1LwFL7qfQpkE4BVWvJb6JPoRPW27",
    "network" : "testnet",
    "nxt-consensus" : {
        "generation-signature" : "2uAufMuJhtbqWRd7mMnB5ibRFq4PsDoVk1X1UrhePvkX",
        "base-target" : 225
    },
    "timestamp" : ISODate("2018-04-01T18:20:57.316Z"),
    "transactionCount" : "0",
    "transactions" : [],
    "version" : "3"
```

Here is the description:

| field name | index | description|
| ------ | ------ | ------ |
| _id   | true | ObjectId
| number | true | block number
| hash | true | signature of block
| prevBlockHash | false | hash of prev block
| timestamp | true | date, when block has been in blockchain
| version | false | version (0x02 for Genesis block,, 0x03 for common block)
| blocksize | false | size of block
| fee | false | value of fee
| created | true | date, when created record in database
| transactionCount | false | count of transactions in block
| generator | false | Generation signature
| nxt-consensus.base-target | false | Base target
| nxt-consensus.generation-signature | false | 	Consensus block length (always 40 bytes)




##### wavestxes
The wavestxes collection stores only the most valuable information about the transaction. Here is the example of transaction:
```
    "_id" : ObjectId("5ae3798bf0bd7f023dcfbc47"),
    "__v" : 0,
    "type" : "3",
    "id" : "Gz1HSiHTzNAHVqph8eVm8DD6vqJzWa6VbH89pvCLsXjR",
    "sender" : "3JfE6tjeT7PnpuDQKxiVNLn4TJUFhuMaaT5",
    "senderPublicKey" : "GbGEY3XVc2ohdv6hQBukVKSTQyqP8rjQ8Kigkj6bL57S",
    "fee" : "100000000",
    "signature" : "51GgCFUib9qnWtjiX7ESZN49orTj79EEcZ8nSRZyjzzZaV1ksqVQAohgEQkbqBZyXpWBgfC329MeYHwH8MZHhfNj",
    "assetId" : "Gz1HSiHTzNAHVqph8eVm8DD6vqJzWa6VbH89pvCLsXjR",
    "hash" : "51GgCFUib9qnWtjiX7ESZN49orTj79EEcZ8nSRZyjzzZaV1ksqVQAohgEQkbqBZyXpWBgfC329MeYHwH8MZHhfNj",
    "transfers" : [],
    "timestamp" : 1524856745268.0,
    "blockNumber" : 3901
```

Here is the description:

| field name | index | description|
| ------ | ------ | ------ |
| _id   | true | the ObjectId
| blockNumber   | true | the block number
| amount   | false | amount
| hash | true | signature of transaction
| id | false | id of transaction
| signature | false | signature of transaction (as in waves endpoint)
| type | false | type of transaction
| recipient | true | address of recipient
| sender | true |  address of recipient
| assetId | true | asset id
| feeAsset | false | fee of asset
| attachment | false | attachment
| senderPublicKey | false | public key of sender
| fee | false | fee
| transfers.recipient | true | address of transfers recipient
| transfers.amount | false | amount of transfer
| timestamp   | true | the timestamp when tx has been mined



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
| BLOCK_GENERATION_TIME | generation time for block

License
----
 [GNU AGPLv3](LICENSE)

Copyright
----
LaborX PTY
