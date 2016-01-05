var defaultOptions = require('fbjs-scripts/babel/default-options');

module.exports = Object.assign({}, defaultOptions, {
  // Normally we'd use babelPluginDEV here but ReactART doesn't contain __DEV__
  _moduleMap: Object.assign({}, defaultOptions._moduleMap, require('fbjs/module-map'), {
    'art/core/transform': 'art/core/transform',
    'art/modes/current': 'art/modes/current',
    'art/modes/fast-noSideEffects': 'art/modes/fast-noSideEffects',
    'art/modes/svg': 'art/modes/svg',
    'Object.assign': 'react/lib/Object.assign',
    'React': 'react',
    'ReactDOM': 'react-dom',
    'ReactInstanceMap': 'react/lib/ReactInstanceMap',
    'ReactMultiChild': 'react/lib/ReactMultiChild',
    'ReactTestUtils': 'react-addons-test-utils',
    'ReactUpdates': 'react/lib/ReactUpdates',

    // TODO: move into fbjs-scripts/babel/default-options since this is due to fbjs-scripts/jest/environment.js
    // 'core-js/es6': 'core-js/es6',
  }),
});
