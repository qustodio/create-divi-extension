// @remove-on-eject-begin
/**
 * Copyright (c) 2018-present, Elegant Themes, Inc.
 * Copyright (c) 2015-2018, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// @remove-on-eject-end
'use strict';

// ES feature polyfills are injected per-file by @babel/preset-env with
// useBuiltIns: 'usage' (see babel-preset-divi-extension). Do not require
// core-js/stable here — that would ship the full polyfill set.
//
// Add only polyfills Babel cannot detect from static usage (e.g. fetch):
// require('whatwg-fetch');

// In tests, polyfill requestAnimationFrame since jsdom doesn't provide it yet.
// We don't polyfill it in the browser--this is user's responsibility.
if (process.env.NODE_ENV === 'test') {
  require('raf').polyfill(global);
}
