'use strict';

var request         =  require('request')
  , xtend           =  require('xtend')
  , requestAllPages =  require('request-all-pages')
  , condensePages   =  require('./condense-pages')
  , inspect         =  require('valuepack-core/util/inspect');

function meta (res) {
  if (!res.headers) return {};
  return { 
    headers: {
        remaining    :  res.headers['x-ratelimit-remaining']
      , etag         :  res.headers['etag']
      , lastModified :  res.headers['last-modified']
      , date         :  res.headers['date']
      }
    , modified : res.modified
  };
}

function headers (hdrs) {
  return xtend(
      hdrs 
    , { 'user-agent': 'valuepack' }
  );
}

function userDetails (options, cb) {
  var opts = {
        uri: 'https://api.github.com/users/' + options.user + '/followers' + options.query
      , json: true
      , body: { }
      , headers: headers(options.etag)
    };

  request.get(opts, function (err, res, body) {
    if (err) return cb(err);
    inspect({ remaining: res.headers['x-ratelimit-remaining'] });

    if (res.statusCode === 304) return cb(null, { followers: true }, meta(res));
    if (res.statusCode !== 200) return cb(body);
    cb(null, xtend({ followers: body }, meta(res)));
  })
}

function repos (options, cb) {
  var opts = {
        uri: 'https://api.github.com/users/' + options.user + '/repos' + options.query
      , json: true
      , body: { }
      , headers: headers(options.headers)
    };

  requestAllPages(opts, options.startPage, options.perPage, function (err, pages) {
    if (err) return cb(err);

    var res = condensePages(pages);
    inspect({ remaining: res.headers['x-ratelimit-remaining'] });

    if (res.statusCode === 304) return cb(null, xtend({ body: true }, meta(res)));
    if (res.statusCode !== 200) return cb(res.body);
    
    cb(null, xtend({ body: res.body }, meta(res)));
  })
}

/**
 * @param opts {Object} { getUserDetails: true|false (if true user info, i.e. followers will be included), query: maybe empty }
 * @param cb  
 */
var get = module.exports = function (opts, cb ) {
  var tasks = opts.getUserDetails ? 2 : 1
    , data = { user: opts.login }
    , error;

  opts = xtend(opts, { startPage: 1, perPage: 100 });

  repos(opts, function (err, res) {
    if (error) return;
    if (err) return cb(error = err);
    data.repos = res;
    data.remaining = res.remaining;

    if (!--tasks) cb(null, data);
  });

  if (opts.getUserDetails) {
    userDetails(opts, function (err, res) {
      if (error) return;
      if (err) return cb(error = err);

      data.user = res;
      data.remaining = res.remaining;

      if (!--tasks) cb(null, data);
    });
  }
};
