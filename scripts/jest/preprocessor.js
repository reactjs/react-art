var babel = require('babel-core');
var babelOptions = Object.assign({retainLines: true}, require('../babel/options'))

module.exports = {
  process: function(src, path) {
    // Don't transform anything in node_modules or this will take forever
    if (path.match(/\/node_modules\//)) {
      return src;
    }
    return babel.transform(src, Object.assign({filename: path}, babelOptions)).code;
  }
};
