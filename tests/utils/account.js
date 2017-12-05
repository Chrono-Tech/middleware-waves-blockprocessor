const curve25519 = require('axlsign'),
  _ = require('lodash'),
  Base58 = require('base58-native');

module.exports = {
  getPairFromAccountSeed: (seed)=>{
    let accountSeed = Base58.decode(seed);

    let croppedKey = _.take(accountSeed, 32);
    croppedKey[0]  &= 248;
    croppedKey[31] &= 127;
    croppedKey[31] |= 64;

    let p = curve25519.generateKeyPair(Buffer.from(croppedKey));
    return {
      privateKey:Base58.encode(new Uint8Array(p.private)),
      publicKey: Base58.encode(new Uint8Array(p.public))
    }
  }
};
