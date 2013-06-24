'use strict';

var requestAllPages =  require('request-all-pages')
  , xtendHeaders    =  require('./extend-headers')
  , handlePages     =  require('./handle-pages');

function fetch(retry, options, pagesOpts, lastModified, resource, cb) {
  var headers = options.headers || {};
  headers['If-Modified-Since'] = lastModified || new Date(0);

  var opts = {
        uri: 'https://api.github.com/users/' + options.user + '/' + resource + options.query
      , json: true
      , body: { }
      , headers: xtendHeaders(headers)
    };

  requestAllPages(opts, pagesOpts, function (err, pages) {
    if (err) return cb(err);

    handlePages(pages, function (err, res) {
      if (err) return cb(err);
      if (!res.mixedModifieds) return cb(null, res);

      if (retry) {
        // So some pages where modified others were not.
        // As a result we got an incomplete data set and we refuse to figure out how to merge this with the existing one.
        // Lets do it over and make sure we get all pages this time.
        return process.nextTick(fetch.bind(null, false, options, pagesOpts, new Date(0), resource, cb));
      }
      
      // We retried before and still got some modified and some unmodified pages, shouldn't ever happen, so bail
      cb(new Error('Tried twice to get pages with consistent modifieds, but failed'));
    });
  });
}

module.exports = fetch.bind(null, true);
