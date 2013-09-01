'use strict';

var log = require('valuepack-core/util/log')

function resolveUserId (uname, repos) {
  for (var i = 0; i < repos.length; i++) {
    var r = repos[i];
    if (r.owner && r.owner.login === uname && r.owner.id)
      return r.owner.id;
  }
}

function resolveStarredRepoNames(repos, username) {
  return repos
    .filter(function (r) { return r.owner && r.owner.login !== username })
    .map(function (r) {  return r.full_name });
}

/**
 * Structures the parsed responses.
 * @name structure
 * @function
 * @param parsed {Object} assumed to contains repos, user details and user's starred repos responses
 */
module.exports = function structure (parsed, username) {
  if (!parsed) {
    log.warn('structure-parsed-response', 'parsing response for %s returned nothing', username);
    return null;
  }

  var reposRes            =  parsed.repos
    , userRes             =  parsed.user
    , starredRes          =  parsed.starred
    , reposModified       =  reposRes.modified
    , userModified        =  userRes.modified
    , starredModified     =  starredRes.modified
    , reposLastModified   =  reposRes.headers.lastModified
    , userLastModified    =  userRes.headers.lastModified
    , starredLastModified =  starredRes.headers.lastModified
    , remaining           =  Math.min(reposRes.headers.remaining, userRes.headers.remaining, starredRes.headers.remaining);

  var userMetadata = {
      name                :  parsed.username
    , detailsLastModified :  userLastModified
    , reposLastModified   :  reposLastModified
    , starredLastModified :  starredLastModified
  };

  var repos = reposModified ? reposRes.body : null;

  var followers = userRes.body.followers && userRes.body.followers.map(
    function (f) { return f.login }
  );

  var userData = userModified
    ? { name           :  username
      , followers      :  followers
      , followersCount :  followers ? followers.length : 0
      }
    : null;

  // aborted flag is set in when more pages are needed to fetch all starred repos than defined in 'fetch-github-repos'
  // in case it was aborted just treat it as if we found none and set it null
  var starredData = starredModified && !starredRes.aborted
    ? (function () {
        var repos = resolveStarredRepoNames(starredRes.body, username);
        return {
          repos :  repos
        , count :  repos.length
        };
      })()
    : null;

  if (repos && repos.length && userData) {
    var id = resolveUserId(username, repos);
    if (id) userData.id = id;
  }

  return {
      userData        :  userData
    , starredData     :  starredData
    , userMetadata    :  userMetadata
    , repos           :  repos
    , userModified    :  userModified
    , starredModified :  starredModified
    , reposModified   :  reposModified
    , remaining       :  remaining
  };
};
