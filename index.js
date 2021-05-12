let rendezvous = require('./lib/rendezvous.js');
let unencrypted = require('./lib/unencrypted.js');
let encrypted = require('./lib/encrypted.js');
let diceware = require('niceware');

let { decodeAscii, encodeAscii } = require('./lib/util.js');

class SecureWormhole {
  constructor (connection) {
    this.wormhole = connection
    this.key = this.wormhole.key
  }

  send (messageToSend, phase = '0') {
    this.wormhole.send(phase, encodeAscii(JSON.stringify(messageToSend)));
  }

  async receive (phase = '0') {
    let msg = await this.waitForPhase(phase);
    let decoded = JSON.parse(decodeAscii(msg));
    return decoded
  }

  async checkVersion (app_versions = {}) {
    this.wormhole.send('version', encodeAscii(JSON.stringify({ app_versions: app_versions })))

    let versionBytes = await this.waitForPhase('version');
    if (versionBytes === null) {
      throw new Error('failed to establish secure channel');
    }
    let theirVersion = decodeAscii(versionBytes);
    return theirVersion
  }


  waitForPhase(desiredPhase) {
    return new Promise(resolve => {
      this.wormhole.subscribe(({ phase, body }) => {
        if (phase === desiredPhase) {
          resolve(body);
        }
      });
    });
  }
}

class WormholeClient {
  constructor (url, appid, opts) {
    if (!opts) opts = {}
    this.url = url
    this.appid = appid
    this.side = opts.side || Math.floor(Math.random() * 2 ** 40).toString(16)
  }

  async _createWormhole (unencryptedChannel, password) {
    let connection = await encrypted.initialize(unencryptedChannel, this.side, password)
    let wormhole = new SecureWormhole(connection)
    return wormhole
  }

  async getCode () {
    this.rendezvousChannel = await rendezvous.init(this.url);
    this.unencryptedChannel = await unencrypted.initSender(this.rendezvousChannel, this.side)
    let password = diceware.generatePassphrase(4).join('-')
    let code = this.unencryptedChannel.nameplate + '-' + password
    return code
  }

  async announce (code) {
    if (!code) throw new Error('code required as argument to announce')
    let [nameplate, password] = this._parts(code)
    let wormhole = await this._createWormhole(this.unencryptedChannel, password)
    this.rendezvousChannel = null
    this.unencryptedChannel = null
    return wormhole
  }

  _parts (code) {
    let dash = code.indexOf('-');
    if (dash === -1) {
      throw new Error('Code must be of the form 0-wormhole-code');
    }
    let nameplate = code.slice(0, dash);
    let password = code.slice(dash + 1);
    return [nameplate, password]
  }

  async accept (code) {
    this.rendezvousChannel = await rendezvous.init(this.url);
    let [nameplate, password] = this._parts(code)
    let unencryptedChannel = await unencrypted.initReceiver(this.rendezvousChannel, this.side, nameplate)
    let wormhole = await this._createWormhole(unencryptedChannel, password)
    this.rendezvousChannel = null
    return wormhole
  }

  async close () {
    if (this.rendezvousChannel) {
      this.rendezvousChannel.close()
      this.rendezvousChannel = null
      console.log('closing')
    }
    throw new Error('no channel open!')
  }
}

module.exports = { WormholeClient, SecureWormhole }

