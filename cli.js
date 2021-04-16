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
      let wormhole = await factory.start()

      process.stdin.on('data', async (data) => {
        wormhole.send({ offer: { message: data.toString() }});
        let msg = await wormhole.receive()
        console.log(msg)
      })
      break;
    }

    case 'receive': {
      if (process.argv.length !== 4) {
        usage();
      }
      let codeArg = process.argv[3];
      let dash = codeArg.indexOf('-');
      if (dash === -1) {
        console.error('Code must be of the form 0-wormhole-code');
        usage();
      }
      let nameplate = codeArg.slice(0, dash);
      let ephemeralPassword = codeArg.slice(dash + 1);
      let wormhole = await factory.accept(nameplate, ephemeralPassword);
      let offerObj = await wormhole.receive()

      if ({}.hasOwnProperty.call(offerObj, 'transit')) {
        panic('files/directories are not supported');
      }
      if (!{}.hasOwnProperty.call(offerObj, 'offer') || !{}.hasOwnProperty.call(offerObj.offer, 'message')) {
        panic('unexpected message ' + decodeAscii(offerObj.offer));
      }
      console.log('got message:');
      console.log(offerObj.offer.message);

      process.stdin.on('data', async (data) => {
        wormhole.send({ answer: { message_ack: 'ok', some_other_metadata: data.toString() }});
        let msg = await wormhole.receive()
        console.log(msg)
      })

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
