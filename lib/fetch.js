'use strict';

var requestAllPages =  require('request-all-pages')
  , xtendHeaders    =  require('./extend-headers')
  , handlePages     =  require('./handle-pages');

module.exports = function (options, lastModified, resource, cb) {
  var headers = options.headers || {};
  headers['If-Modified-Since'] = lastModified || new Date(0);

  var opts = {
        uri: 'https://api.github.com/users/' + options.user + '/' + resource + options.query
      , json: true
      , body: { }
      , headers: xtendHeaders(headers)
    };

  requestAllPages(opts, options.startPage, options.perPage, function (err, pages) {
    if (err) return cb(err);
    handlePages(pages, cb);
  });
}


