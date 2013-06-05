'use strict';

var request = require('request')
  , xtend = require('xtend')
  , inspect = require('valuepack-core/util/inspect');

function meta(res) {
  if (!res.headers) return {};
  return { remaining: res.headers['x-ratelimit-remaining'], etag: res.headers['etag'] };
}

function userDetails (options, cb) {
  var info = { name: options.user }
    , opts = {
        uri: 'https://api.github.com/users/' + options.user + '/followers' + options.query
      , json: true
      , body: { }
      , headers: { 'user-agent': 'valuepack' }
      };

  request.get(opts, function (err, res, body) {
    if (err) return cb(err);
    if (res.statusCode !== 200) return cb(body);
    info.followers = body;
    cb(null, { body: body, remaining: res.headers['x-ratelimit-remaining'], etag: res.headers['etag'] });
  })
}

function repos (options, cb) {
  var opts = {
      uri: 'https://api.github.com/users/' + options.user + '/followers' + options.query
    , json: true
    , body: { }
    , headers: { 
        'user-agent': 'valuepack' 
      , 'If-None-Match': options.etag || '"311c3d362c7bc0ec5bb989546d6a82fa"' // TODO: store etag in db and pass it along
    }
  };

  request.get(opts, function (err, res, body) {
    if (err) return cb(err);
    inspect(res.headers);
    if (res.statusCode === 304) return cb(null, xtend({ body: null }, meta(res)));
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
    , data = {}

  repos(opts, function (err, res) {
    if (err) return cb(err);
    data.repos = res;
    if (!--tasks) cb(null, data);
  });

  if (opts.getUserDetails) {
    userDetails(opts, function (err, res) {
      if (err) return cb(err);

      data.user = res;
      if (!--tasks) cb(null, data);
    });
  }
};

get({ user: 'thlorenz', getUserDetails: true, query: require('./client-id-secret-query') }, function (err, res) {
  if (err) return console.error(err);
  inspect(res);
});
