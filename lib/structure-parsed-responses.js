'use strict';

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

  var starredData = starredModified
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
