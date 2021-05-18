#!/usr/bin/env node

'use strict';

let { WormholeClient } = require('.')
let { panic, decodeAscii, encodeAscii } = require('./lib/util.js');
let argv = require('minimist')(process.argv.slice(2));

let url = 'ws://relay.magic-wormhole.io:4000/v1';
let appid = 'lothar.com/wormhole/text-or-file-xfer';

let messageToSend = 'example';

const factory = new WormholeClient(url, appid);

async function main () {
  // TODO replace this with a library that does this, if there exists one that isn't awful
   if (argv.help) return usage(0);
   switch (argv._[0]) {
     case 'send':
       if (argv._.length !== 1) {
         usage();
       }

       let code = await factory.getCode(argv.lang)
       console.log('wormhole code:', code)

       let wormhole = await factory.announce(code)

       console.log('connected! type something')

       process.stdin.on('data', async (data) => {
         wormhole.send({ offer: { message: data.toString() } });
         let msg = await wormhole.receive()
         console.log(msg)
         process.exit(0)
       })
       break;
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
  send [--lang]   send text over wormhole
  receive <code>  receive text over wormhole

Language: --lang <LANG> can be one of italian, chinese_simplified, japanese, french, korean, czech, portuguese, or chinese_traditional`);
  process.exit(code);
}
