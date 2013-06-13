'use strict';
var condensePages =  require('./condense-pages')
  , xtend         =  require('xtend')
  , meta          =  require('./response-metadata');

module.exports = function (pages, cb) {
  var res = condensePages(pages);
  
  if (res.statusCode === 304) return cb(null, xtend({ body: null }, meta(res)));
  if (res.statusCode !== 200) return cb(res.body);
  
  cb(null, xtend({ body: res.body }, meta(res)));
}

