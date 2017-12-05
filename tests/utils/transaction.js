const sign = require('./signature'),
  _ = require('lodash');

module.exports = {
  transfer: (toAddress, amount, account) => {

    let tx = {
      senderPublicKey: account.publicKey,
      recipient: toAddress,
      fee: 100000,
      amount: amount,
      timestamp: Date.now()
    };

    let signature = sign.signatureData(
      tx.senderPublicKey, tx.recipient,
      null, 0, null, 0,
      tx.amount, tx.fee, tx.timestamp);

    let signedSignature = sign.sign(account.privateKey, signature);
    return _.merge({signature: signedSignature}, tx);

  }
}
