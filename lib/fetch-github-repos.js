'use strict';

var request         =  require('request')
  , xtend           =  require('xtend')
  , fetch           =  require('./fetch');

function repos(opts, pagesOpts, cb) {
  fetch(opts, opts.reposLastModified, pagesOpts, 'repos', cb);
}

function userDetails(opts, pagesOpts, cb) {
  fetch(opts, opts.userLastModified, pagesOpts, 'followers', cb);
}

function userStarred(opts, pagesOpts, cb) {
  fetch(opts, opts.starredLastModified, pagesOpts, 'starred', cb);
}

/**
 * @param opts {Object} { 
 *      getUserDetails      :  true|false (if true user info, i.e. followers will be included)
 *    , getUserStarred      :  true|false (if true repos that user starred will be included)
 *    , reposLastModified   :  last modified date of user repos
 *    , userLastModified    :  last modified date of user details
 *    , starredLastModified :  last modified date of user's starred repos
 *    , query               :  appended to the requested url, maybe empty
 *  }
 * @param cb  
 */
var get = module.exports = function (opts, cb ) {
  var tasks = 1 
    , data = { username: opts.user }
    , error;

  if (opts.getUserDetails) tasks++;
  if (opts.getUserStarred) tasks++;

  opts = xtend(opts, { startPage: 1, perPage: 100 });

  repos(opts, { perPage: 100 }, function (err, res) {
    if (error) return;
    if (err) return cb(error = err);
    data.repos = res;
    data.remaining = res.remaining;

    if (!--tasks) cb(null, data);
  });

  if (opts.getUserDetails) {
    userDetails(opts, { perPage: 100 }, function (err, res) {
      if (error) return;
      if (err) return cb(error = err);

      data.user = res;
      data.user.body = { followers: res.body };
      data.remaining = res.remaining;

      if (!--tasks) cb(null, data);
    });
  }

  if (opts.getUserStarred) {
    userStarred(opts, { perPage: 100, limit: { maxPages: 15, abort: true } }, function (err, res) {
      if (error) return;
      if (err) return cb(error = err);

      data.starred = res;
      data.remaining = res.remaining;

      if (!--tasks) cb(null, data);
    });
  }
};
