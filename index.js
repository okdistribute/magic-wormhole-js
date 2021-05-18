let rendezvous = require('./lib/rendezvous.js');
let unencrypted = require('./lib/unencrypted.js');
let encrypted = require('./lib/encrypted.js');
let bip = require('bip39')
let path = require('path')
let fs = require('fs')
let crypto = require('crypto')

let { decodeAscii, encodeAscii } = require('./lib/util.js');

export class SecureWormhole {
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

    this.waitForPhase('version').then((versionBytes) => {
      if (versionBytes === null) {
        throw new Error('failed to establish secure channel');
      } else { 
        let theirVersion = decodeAscii(versionBytes);
        console.log('got their version', theirVersion)
      }
    })
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

export class WormholeClient {
  constructor (url, appid, opts) {
    if (!opts) opts = {}
    this.url = url
    this.appid = appid
    this.side = opts.side || Math.floor(Math.random() * 2 ** 40).toString(16)
  }

  async _createWormhole (unencryptedChannel, password) {
    let connection = await encrypted.initialize(unencryptedChannel, this.side, password)
    let wormhole = new SecureWormhole(connection)
    console.log('checking version')
    await wormhole.checkVersion()
    return wormhole
  }

  _getPassword (lang) {
    let english
    if (lang) {
      bip.setDefaultWordlist(lang)
    } else {
      english = fs.readFileSync(path.join('lib', 'wordlist_en.txt')).toString().split('\n')
    }
    let passwordPieces = bip.entropyToMnemonic(crypto.randomBytes(32), english).split(' ')
    let password = passwordPieces.filter(p => p !== '').slice(0, 2)
    if (password.length < 2) return this._getPassword(lang)
    else return password.join('-')
  }

  async getCode (lang) {
    this.rendezvousChannel = await rendezvous.init(this.url);
    this.unencryptedChannel = await unencrypted.initSender(this.rendezvousChannel, this.side)
    let password = this._getPassword(lang)
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
    }
    throw new Error('no channel open!')
  }
}