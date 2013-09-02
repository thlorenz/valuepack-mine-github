'use strict';

var requestAllPages =  require('request-all-pages')
  , log             =  require('valuepack-core/util/log')
  , xtendHeaders    =  require('./extend-headers')
  , handlePages     =  require('./handle-pages');
 
var setImmediate = setImmediate || function (fn) { setTimeout(fn, 0) };

function fetch(retry, options, pagesOpts, lastModified, resource, cb) {
  var headers = options.headers || {};
  headers['If-Modified-Since'] = lastModified || new Date(0);

  var retriesOnHangup = typeof options.retriesOnHangup === 'undefined' ? 3 : options.retriesOnHangup;

  var opts = {
        uri: 'https://api.github.com/users/' + options.user + '/' + resource + options.query
      , json: true
      , body: { }
      , headers: xtendHeaders(headers)
    };

  requestAllPages(opts, pagesOpts, function (err, pages) {
    if (err) {
      // not a socket hangup? - nothing we can do
      if (err.code !== 'ECONNRESET') return cb(err);

      // on 'socket hangup' errors we may want to retry since github may just have been slow
      // I saw this in 22/1700 requests
      if (retriesOnHangup <= 0) { 
        log.warn(__filename, 'got numerous socket hangups in a row, giving up');
        return cb(err);
      }

      // try again
      log.verbose(__filename, 'got socket hangup for %s, trying again', options.user);
      options.retriesOnHangup = retriesOnHangup - 1;
      return setTimeout(fetch.bind(null, retry, options, pagesOpts, lastModified, resource, cb), 5000);
    }

    var res;
    try {
      res = handlePages(pages)
    } catch (err) { return cb(err); }

    if (!res.mixedModifieds) return cb(null, res);

    if (retry) {
      // So some pages where modified others were not.
      // As a result we got an incomplete data set and we refuse to figure out how to merge this with the existing one.
      // Lets do it over and make sure we get all pages this time.
      return setImmediate(fetch.bind(null, false, options, pagesOpts, new Date(0), resource, cb));
    }
    
    // We retried before and still got some modified and some unmodified pages, shouldn't ever happen, so bail
    cb(new Error('Tried twice to get pages with consistent modifieds, but failed'));
  });
}

module.exports = fetch.bind(null, true);
