'use strict';

var request         =  require('request')
  , xtend           =  require('xtend')
  , requestAllPages =  require('request-all-pages')
  , handlePages     =  require('./handle-pages')
  , fetch           =  require('./fetch');


function repos(opts, cb) {
  fetch(opts, opts.reposLastModified, 'repos', cb);
}

function userDetails(opts, cb) {
  fetch(opts, opts.userLastModified, 'followers', cb);
}

function userStarred(opts, cb) {
  fetch(opts, opts.starredLastModified, 'starred', cb);
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
      data.user.body = { followers: res.body };
      data.remaining = res.remaining;

      if (!--tasks) cb(null, data);
    });
  }

  if (opts.getUserStarred) {
    userStarred(opts, function (err, res) {
      if (error) return;
      if (err) return cb(error = err);

      data.starred = res;
      data.remaining = res.remaining;

      if (!--tasks) cb(null, data);
    });
  }
};
