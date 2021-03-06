'use strict';
var condensePages =  require('./condense-pages')
  , xtend         =  require('xtend')
  , meta          =  require('./response-metadata');

module.exports = function (pages) {
  var res = condensePages(pages);
  
  if (res.statusCode === 304) return xtend({ body: null }, meta(res));
  if (res.statusCode !== 200) throw new Error(res.body);
  
  return xtend({ body: res.body }, meta(res));
}

