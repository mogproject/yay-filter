'use strict';

var webpack = require('webpack');

// Debug flag
const debugEnabled = process.env.NODE_ENV === 'development';

module.exports = {
    // Set debugging source maps to be "inline" for
    // simplicity and ease of use
    devtool: 'inline-source-map',
    mode: process.env.NODE_ENV,

    // The application entry point
    entry: {
        content: './src/content.ts',
        popup: './src/popup.ts',
    },

    // Where to compile the bundle
    // By default the output directory is `dist`
    output: {
        path: __dirname + '/dist/firefox/js',
        filename: '[name].js',
    },

    // Supported file loaders
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },

    // File extensions to support resolving
    resolve: {
        extensions: ['.ts', '.js'],
    },

    plugins: [
        new webpack.DefinePlugin({
            __DEBUG__: JSON.stringify(debugEnabled),
        }),
    ],
};
