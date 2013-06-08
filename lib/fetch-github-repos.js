'use strict';

var request = require('request')
  , xtend = require('xtend')
  , inspect = require('valuepack-core/util/inspect');

function meta (res) {
  if (!res.headers) return {};
  return { remaining: res.headers['x-ratelimit-remaining'], etag: res.headers['etag'] };
}

function headers (etag) {
  return  { 
    'user-agent': 'valuepack' 
  , 'If-None-Match': etag // TODO: store etag in db and pass it along
  };
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
    inspect(res.headers);

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
      , headers: headers(options.etag)
    };

  request.get(opts, function (err, res, body) {
    if (err) return cb(err);
    inspect(res.headers);

    if (res.statusCode === 304) return cb(null, xtend({ body: true }, meta(res)));
    if (res.statusCode !== 200) return cb(body);
    cb(null, xtend({ body: body }, meta(res)));
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

  // being optimistic with 500 here, github's limit is actually at 100 right now
  opts.query = opts.query && opts.query.length
    ? opts.query + '&per_page=500'
    : '?per_page=500';

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
