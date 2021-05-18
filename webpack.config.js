const path = require("path");
const webpack = require('webpack')
const CopyPlugin = require("copy-webpack-plugin");
const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");

const dist = path.resolve(__dirname, "dist");

module.exports = {
  mode: "production",
  entry: "./index.js",
  output: {
    path: dist,
    filename: "index.js",
    libraryTarget: "umd"
  },
  plugins: [
    new WasmPackPlugin({
      crateDirectory: path.join(__dirname, 'spake2-wasm'),
    }),
    new webpack.IgnorePlugin(/^\.\/wordlists\/(?!english)/, /bip39\/src$/),
  ],

    module: {
        rules: [
           {
            test: /\.m?js$/,
            exclude: /node_modules/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: [
                        ['@babel/preset-env']
                    ],
                    plugins: [
                        [ 'babel-plugin-static-fs', {
                            target: 'browser' 
                        } 
                    ]
                ]
                }
            }
           }
        ],

    }
};