var nodeExternals = require('webpack-node-externals');
var webpack = require('webpack');
var browserify = require('browserify');
var babelify = require('babelify');
var path = require('path');
var fs = require('fs');
var os = require('os');
var deleteEmpty = require('delete-empty');
var PACKAGE_FILE = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));
var LIB_NAME = PACKAGE_FILE.name;
var UglifyJS = require("uglify-js");

/* helper function to get into build directory */
var libPath = function (name) {
    if (undefined === name) {
        return 'dist';
    }

    return path.join('dist', name);
};

/* helper to clean leftovers */
var outputCleanup = function (dir) {
    if (false == fs.existsSync(libPath())) {
        return;
    }

    var list = fs.readdirSync(dir);
    for (var i = 0; i < list.length; i++) {
        var filename = path.join(dir, list[i]);
        var stat = fs.statSync(filename);

        if (filename == '.' || filename == '..') {
            // pass these files
        } else if (stat.isDirectory()) {
            // outputCleanup recursively
            outputCleanup(filename, false);
        } else {
            // rm fiilename
            fs.unlinkSync(filename);
        }
    }
    fs.rmdirSync(dir);
};

/* precentage handler is used to hook build start and ending */
var percentage_handler = function handler(percentage, msg) {
    if (0 === percentage) {
        /* Build Started */
        outputCleanup(libPath());
        console.log('Build started... Good luck!');
    } else if (1.0 === percentage) {
        // TODO: No Error detection. :(
        create_browser_version(webpack_opts.output.filename);
    }
};

var webpack_opts = {
    entry: './src/index.ts',
    target: 'node',
    output: {
        filename: libPath('index.js'),
        libraryTarget: 'commonjs2'
    },
    devtool: 'source-map',
    resolve: {
        extensions: ['.ts', '.js'],
        modules: [
            'node_modules',
            'src',
        ]
    },
    module: {
        loaders: [
            {
                enforce: 'pre',
                test: /\.ts$/,
                loader: 'tslint-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                exclude: [
                    /node_modules/
                ],
            },
            {
                test: /\.js$/,
                loader: 'source-map-loader',
                exclude: /node_modules/,
            }
        ]
    },
    externals: [nodeExternals()],
    plugins: [
        new webpack.optimize.UglifyJsPlugin({sourceMap: true}),
        new webpack.LoaderOptionsPlugin({
            options: {
                tslint: {
                    emitErrors: true,
                    failOnHint: true
                }
            }
        }),
        new webpack.ProgressPlugin(percentage_handler)
    ],
};

var create_browser_version = function (inputJs) {
    let outputName = inputJs.replace(/\.[^/.]+$/, '');
    outputName = `${outputName}.browser.js`;
    console.log('Creating browser version ...');

    let b = browserify(inputJs, {
        standalone: LIB_NAME,
    }).transform(babelify, {
        presets: ["es2015"],
        global: true,
        ignore: /\/node_modules\//,
        // test: /\/node_modules\/bitcoinjs-lib/,
        plugins: ["transform-es2015-block-scoping"]})
      .bundle()
      .pipe(fs.createWriteStream(outputName));
};

module.exports = webpack_opts;
