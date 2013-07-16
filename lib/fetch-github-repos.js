'use strict';

var request         =  require('request')
  , xtend           =  require('xtend')
  , fetch           =  require('./fetch');

function repos(opts, pagesOpts, cb) {
  fetch(opts, pagesOpts, opts.reposLastModified, 'repos', cb);
}

function userDetails(opts, pagesOpts, cb) {
  fetch(opts, pagesOpts, opts.userLastModified, 'followers', cb);
}

function userStarred(opts, pagesOpts, cb) {
  fetch(opts, pagesOpts, opts.starredLastModified, 'starred', cb);
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
    , error
    , perPage = 100;

  if (opts.getUserDetails) tasks++;
  if (opts.getUserStarred) tasks++;

  repos(opts, { perPage: perPage }, function (err, res) {
    if (error) return;
    if (err) return cb(error = err);
    data.repos = res;
    data.remaining = res.remaining;

    if (!--tasks) cb(null, data);
  });

  if (opts.getUserDetails) {
    userDetails(opts, { perPage: perPage }, function (err, res) {
      if (error) return;
      if (err) return cb(error = err);

      data.user = res;
      data.user.body = { followers: res.body };
      data.remaining = res.remaining;

      if (!--tasks) cb(null, data);
    });
  }

  if (opts.getUserStarred) {
    // if the user starred too many repos (> 1.5K), we don't want to waste available requests
    // in order to get them since they are most likely not that meaningful anyways
    userStarred(opts, { perPage: perPage, limit: { maxPages: 15, abort: true } }, function (err, res) {
      if (error) return;
      if (err) return cb(error = err);

      data.starred = res;
      data.remaining = res.remaining;

      if (!--tasks) cb(null, data);
    });
  }
};
