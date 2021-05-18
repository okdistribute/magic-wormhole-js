# magic-wormhole-js

An unofficial JavaScript port of [magic-wormhole](https://github.com/warner/magic-wormhole).

This gets as far as establishing a secure channel ("Wormohle") between the two parties and sending a simple text message, but does not yet implement the remainder of the [file transfer protocol](https://github.com/warner/magic-wormhole/blob/master/docs/file-transfer-protocol.md). Pull requests welcome!


## Usage

```
npm install
```
to install dependencies, then

```
node cli.js send-demo
```

will open a wormhole with a password, and once the receiver has entered the code, you can start typing into the terminal and hit enter to send the text to the recevier.


To enter the code, type

```
node cli.js receive 0-wormhole-code
```

These interoperate with the python implementation, so you can receive text sent by `send-demo` using `wormhole receive --only-text 0-wormhole-code` and send text to be received by `receive` using `wormhole send --text example`.


## Language

To change the language, use `--lang=LANGUAGE` where LANGUAGE can be any of: italian, chinese_simplified, japanese, french, korean, czech, portuguese, or chinese_traditional



## Usage with `npx`

Instead of cloning and installing locally, you can do
```
npx magic-wormhole send-demo
```
and

```
npx magic-wormhole receive 0-wormhole-code
```

anywhere that a modern node and npm is installed.

## Usage in the Browser

Right now this is very hacky and relies on monkeypatching in spake2 wasm
handling. If you add this script to your index.html,
magic-wormhole will be able to attach to the wasm version of spake2.

This could be improved...

```html
<html>
  <head>
    <meta content="text/html;charset=utf-8" http-equiv="Content-Type"/>
  </head>
  <body>
    <div id="root"> </div>
    <script type="module"> 
      import init, { start, msg, finish } from './lib/spake2/spake2_wasm.js';

      window.spake2 = {
        start,
        msg, 
        finish
      }

      async function run () {
        await init();
      }
      run();

    </script>
    <script src="bundle.js"></script>
  </body>
</html>

```

