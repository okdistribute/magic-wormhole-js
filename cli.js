#!/usr/bin/env node

'use strict';

let WormholeFactory = require('.')
let { panic, decodeAscii, encodeAscii } = require('./lib/util.js');

let url = 'ws://relay.magic-wormhole.io:4000/v1';
let appid = 'lothar.com/wormhole/text-or-file-xfer';

let messageToSend = 'example';

const factory = new WormholeFactory(url, appid);

async function main () {
  // TODO replace this with a library that does this, if there exists one that isn't awful
  switch (process.argv[2]) {
    case '--help': {
      usage(0);
    }
    case 'send': {
      if (process.argv.length !== 3) {
        usage();
      }

      let code = await factory.getCode()
      console.log('wormhole code:', code)

      let wormhole = await factory.announce(code)

      process.stdin.on('data', async (data) => {
        wormhole.send({ offer: { message: data.toString() }});
        let msg = await wormhole.receive()
        process.exit(0)
      })
      break;
    }

    case 'receive': {
      if (process.argv.length !== 4) {
        usage();
      }
      let codeArg = process.argv[3];
      let wormhole, offerObj
      try {
        wormhole = await factory.accept(codeArg);
        offerObj = await wormhole.receive()
      } catch (err) {
        console.error(err)
        usage()
      }

      if ({}.hasOwnProperty.call(offerObj, 'transit')) {
        panic('files/directories are not supported');
      }
      if (!{}.hasOwnProperty.call(offerObj, 'offer') || !{}.hasOwnProperty.call(offerObj.offer, 'message')) {
        panic('unexpected message ' + decodeAscii(offerObj.offer));
      }
      console.log('got message:');
      console.log(offerObj.offer.message);
      wormhole.send({ answer: { message_ack: "ok" }});
      process.exit(0)

      break;
    }
    default: {
      usage();
    }
  }
}

main();

function usage(code = 1) {
  console.log(`Usage: node ${process.argv[1]} [command]

Commands:
  send            send sample text over wormhole
  receive <code>  receive text over wormhole`);
  process.exit(code);
}
