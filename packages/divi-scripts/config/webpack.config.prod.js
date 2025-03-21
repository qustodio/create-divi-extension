'use strict';

process.traceDeprecation = true;
process.env.NODE_OPTIONS = '--trace-warnings';

const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const FixStyleOnlyEntriesPlugin = require('webpack-fix-style-only-entries');
const TerserPlugin = require('terser-webpack-plugin');
const ManifestPlugin = require('webpack-manifest-plugin');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const eslintFormatter = require('divi-dev-utils/eslintFormatter');
const ModuleScopePlugin = require('divi-dev-utils/ModuleScopePlugin');
const paths = require('./paths');
const getClientEnvironment = require('./env');
const glob = require('divi-dev-utils/glob');

const publicPath = paths.servedPath;
const shouldUseSourceMap = process.env.GENERATE_SOURCEMAP === 'true';
const publicUrl = publicPath.slice(0, -1);
const env = getClientEnvironment(publicUrl);

const postCSSLoaderOptions = {
  sourceMap: shouldUseSourceMap,
  plugins: () => {
    return [
      require('postcss-flexbugs-fixes'),
      autoprefixer({
        flexbox: 'no-2009',
      }),
      cssnano({
        preset: [
          'default',
          {
            mergeRules: false,
          },
        ],
      }),
    ];
  },
};

if (env.stringified['process.env'].NODE_ENV !== '"production"') {
  throw new Error('Production builds must have NODE_ENV=production.');
}

module.exports = {
  mode: 'production',
  bail: true,
  devtool: shouldUseSourceMap ? 'source-map' : false,
  entry: {
    builder: [require.resolve('./polyfills'), paths.appIndexJs],
    style: [paths.appIndexCss],
    frontend: glob.sync([
      `${paths.appScripts}/**/*.js`,
      `${paths.appScripts}/**/*.xmin.js`,
    ]),
  },
  output: {
    path: paths.appBuild,
    filename: 'scripts/[name]-bundle.min.js',
    chunkFilename: 'scripts/[name].chunk.js',
    publicPath: publicPath,
    devtoolModuleFilenameTemplate: (info) =>
      path
        .relative(paths.appSrc, info.absoluteResourcePath)
        .replace(/\\/g, '/'),
  },
  resolve: {
    modules: ['node_modules'].concat(
      process.env.NODE_PATH.split(path.delimiter).filter(Boolean)
    ),
    extensions: ['.web.js', '.mjs', '.js', '.json', '.web.jsx', '.jsx'],
    alias: {
      '@babel/runtime': path.dirname(
        require.resolve('@babel/runtime/package.json')
      ),
      'react-native': 'react-native-web',
    },
    plugins: [new ModuleScopePlugin(paths.appSrc, [paths.appPackageJson])],
  },
  externals: {
    jquery: 'jQuery',
    underscore: '_',
    react: 'React',
    'react-dom': 'ReactDOM',
  },
  module: {
    strictExportPresence: true,
    rules: [
      { parser: { requireEnsure: false } },
      {
        test: /\.(js|jsx|mjs)$/,
        enforce: 'pre',
        include: paths.srcPaths,
        exclude: [/node_modules/, /scripts/],
        use: [
          {
            loader: require.resolve('eslint-loader'),
            options: {
              formatter: eslintFormatter,
              eslintPath: require.resolve('eslint'),
              baseConfig: {
                extends: [require.resolve('eslint-config-divi-extension')],
              },
              ignore: false,
              useEslintrc: false,
            },
          },
        ],
      },
      {
        oneOf: [
          {
            test: /\.(js|jsx|mjs)$/,
            include: paths.srcPaths,
            exclude: /node_modules/,
            use: [
              require.resolve('thread-loader'),
              {
                loader: require.resolve('babel-loader'),
                options: {
                  babelrc: false,
                  presets: [require.resolve('babel-preset-divi-extension')],
                  plugins: [
                    [
                      require.resolve('babel-plugin-named-asset-import'),
                      {
                        loaderMap: {
                          svg: {
                            ReactComponent: 'svgr/webpack![path]',
                          },
                        },
                      },
                    ],
                  ],
                  compact: true,
                  highlightCode: true,
                },
              },
            ],
          },
          {
            test: /\.js$/,
            use: [
              require.resolve('thread-loader'),
              {
                loader: require.resolve('babel-loader'),
                options: {
                  babelrc: false,
                  compact: false,
                  presets: [
                    require.resolve('babel-preset-divi-extension/dependencies'),
                  ],
                  cacheDirectory: true,
                  highlightCode: true,
                },
              },
            ],
          },
          {
            test: /\.module\.css$/,
            use: [
              MiniCssExtractPlugin.loader,
              {
                loader: 'css-loader',
                options: {
                  importLoaders: 1,
                  sourceMap: shouldUseSourceMap,
                  modules: {
                    localIdentName: '[path]__[name]___[local]',
                  },
                },
              },
              {
                loader: 'postcss-loader',
                options: postCSSLoaderOptions,
              },
            ],
          },
          {
            test: /\.(s?css|sass)$/,
            exclude: [/\.module\.css$/, /includes\/fields/],
            use: [
              MiniCssExtractPlugin.loader,
              {
                loader: 'css-loader',
                options: {
                  importLoaders: 1,
                  sourceMap: shouldUseSourceMap,
                },
              },
              {
                loader: 'postcss-loader',
                options: postCSSLoaderOptions,
              },
              {
                loader: 'sass-loader',
                options: {
                  sourceMap: shouldUseSourceMap,
                  implementation: require('sass'),
                },
              },
            ],
          },
          {
            test: [
              /\.bmp$/,
              /\.gif$/,
              /\.jpe?g$/,
              /\.png$/,
              /\.eot$/,
              /\.svg$/,
              /\.ttf$/,
              /\.woff$/,
              /\.woff2$/,
            ],
            use: [
              {
                loader: require.resolve('url-loader'),
                options: { name: 'media/[name].[ext]' },
              },
            ],
          },
          {
            test: /\.(graphql)$/,
            loader: 'graphql-tag/loader',
          },
          {
            test: /includes\/fields\/.*\.scss$/,
            use: require.resolve('null-loader'),
          },
          {
            loader: require.resolve('file-loader'),
            exclude: [/\.(js|jsx|mjs)$/, /\.html$/, /\.json$/],
            options: {
              name: 'media/[name].[ext]',
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin(env.stringified),
    new FixStyleOnlyEntriesPlugin(),
    new MiniCssExtractPlugin({
      filename: 'styles/[name].min.css',
    }),
    new ManifestPlugin({
      fileName: 'asset-manifest.json',
      publicPath: publicPath,
      filter: (file) => {
        if (file.name === 'style.js' || file.name === 'style.css') {
          return false;
        }
        return Boolean(file.path);
      },
      map: (file) => {
        if (file.name === 'builder.css') {
          file.path = `${publicPath}styles/backend-style.min.css`;
        }
        if (file.name === 'builder.js') {
          file.path = `${publicPath}scripts/builder-bundle.min.js`;
        }
        if (file.name === 'frontend.js') {
          file.path = `${publicPath}scripts/frontend-bundle.min.js`;
        }
        return file;
      },
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/,
    }),
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          ecma: 8,
          compress: {
            warnings: false,
            comparisons: false,
          },
          mangle: {
            safari10: true,
          },
          output: {
            comments: false,
            ascii_only: true,
          },
        },
        parallel: true,
        extractComments: false,
      }),
    ],
  },
  node: {
    dgram: 'empty',
    fs: 'empty',
    net: 'empty',
    tls: 'empty',
    child_process: 'empty',
  },
};
