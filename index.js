let rendezvous = require('./lib/rendezvous.js');
let unencrypted = require('./lib/unencrypted.js');
let encrypted = require('./lib/encrypted.js');

let { panic, decodeAscii, encodeAscii } = require('./lib/util.js');

//TODO: this should be on the wormhole object

let defaultEphemeralPassword = 'test-test'; // only used for sending the string 'example'

class EasyWormhole {
  constructor (connection) {
    this.wormhole = connection
  }

  send (messageToSend) {
    this.wormhole.send('0', encodeAscii(JSON.stringify(messageToSend)));
  }

  async receive () {
    let msg = await this.waitForPhase('0');
    let decoded = JSON.parse(decodeAscii(msg));
    return decoded
  }

  async checkVersion () {
    this.wormhole.send('version', encodeAscii(JSON.stringify({ app_versions: {} })))

    let versionBytes = await this.waitForPhase('version');
    if (versionBytes === null) {
      throw new Error('failed to establish secure channel');
    }
    let theirVersion = decodeAscii(versionBytes);
    // TODO confirm version information, maybe?
    return
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

  async _createWormhole (unencryptedChannel, code) {
    let connection = await encrypted.initialize(unencryptedChannel, this.side, code)
    let wormhole = new EasyWormhole(connection)
    await wormhole.checkVersion()
    return wormhole
  }

  async getCode () {
    let rendezvousChannel = await rendezvous.init(this.url);
    this.unencryptedChannel = await unencrypted.initSender(rendezvousChannel, this.side)
    let code = this.unencryptedChannel.nameplate + '-' + defaultEphemeralPassword
    return code
  }

  async announce (code) {
    if (!code) throw new Error('code required as argument to announce')
    let wormhole = await this._createWormhole(this.unencryptedChannel, code)
    return wormhole
  }

  async accept (nameplate = null, ephemeralPassword = null) {
    let rendezvousChannel = await rendezvous.init(this.url);
    let unencryptedChannel = await unencrypted.initReceiver(rendezvousChannel, this.side, nameplate)
    let code = nameplate + '-' + ephemeralPassword

    let wormhole = await this._createWormhole(unencryptedChannel, code)
    return wormhole
  }
}

module.exports = WormholeClient

