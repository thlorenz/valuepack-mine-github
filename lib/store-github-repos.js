'use strict';

var github = require('valuepack-core/mine/namespaces').github;

function resolveUserId (uname, repos) {
  for (var i = 0; i < repos.length; i++) {
    var r = repos[i];
    if (r.owner && r.owner.login === uname && r.owner.id) 
      return r.owner.id;
  }
}

function repoFullName(r) {
  return r.full_name;  
}

/**
 * Structures the parsed responses.
 * @name structure
 * @function
 * @param parsed {Object} assumed to contains repos, user details and user's starred repos responses
 */
function structure (parsed) {
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
    ? { name           :  parsed.username
      , followers      :  followers
      , followersCount :  followers ? followers.length : 0
      }
    : null;

  var starredData = starredModified
    ? { repos :  starredRes.body.map(repoFullName)
      , count :  starredRes.body.length
      }
    : null;

  if (repos && repos.length && userData) {
    var id = resolveUserId(userData.name, repos);
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
}

function getRepoBatch (repos, githubRepos) {
  return repos
    .filter(function (r) {
      // XXX: may need to be smarter than this, i.e. deep-is is a deep-equal fork, but is a separate npm module
      return !r.fork && ~[ 'JavaScript', 'CoffeeScript' ].indexOf(r.language);
    })
    .map(function (r) {
      return {
          type   :  'put'
        , prefix :  githubRepos
        , key    :  r.full_name
        , value  :  {
            name      :  r.name
          , fullname  :  r.full_name
          , forks     :  r.forks
          , stars     :  r.watchers
          , issues    :  r.open_issues
          , hasIssues :  r.has_issues
          , language  :  r.language
          , created   :  r.created_at
          , updated   :  r.updated_at
          , owner     :  r.owner.login
        }
      };
    })
}

function addByOwnerHook(githubRepos, byOwner) {
  githubRepos.pre(function (val, add) {
    add({ prefix :  byOwner
        , type   :  'put'
        , key    :  val.value.owner + '\xff' + val.value.name
        , value  :  val.key });
  });
}

function createBatch (data, username, githubRepos, githubUsers, githubStarred, usersMeta, byOwner, cb) {
  var batch = [];

  var meta = data.userMetadata;
  batch.push({ type: 'put' , prefix: usersMeta, key: meta.name, value: meta });

  if (data.reposModified) { 
    batch = batch.concat(getRepoBatch(data.repos, githubRepos));
    addByOwnerHook(githubRepos, byOwner);
  }

  // TODO: need a fill-in missing with callback

  if (data.starredModified) {
    batch.push({ type: 'put', prefix: githubStarred, key: username, value: data.starredData});
  }

  if (!data.userModified) return cb(batch);

  // handle user data
  var user = data.userData;
  if (user.name !== username) throw new Error('Given username: %s and username in userdata: %s do not match!', username, user.name);
  if (user.id) {
    batch.push({ type: 'put' , prefix: githubUsers, key: username, value: user });
    return cb(batch);
  } 

  // updated user, but not repos (which we use to find user id), so try to find existing user in order to preserve id
  githubUsers.get(user.name, function (err, u) {
    if (!err && u) user.id = u.id;
    batch.push({ type: 'put' , prefix: githubUsers, key: user.name, value: user });
    cb(batch);
  })
}

var store = module.exports = function (db, json, username, cb) {
  var githubRepos   =  db.sublevel(github.repos,     { valueEncoding: 'json' })
    , githubUsers   =  db.sublevel(github.users,     { valueEncoding: 'json' })
    , githubStarred =  db.sublevel(github.starred,   { valueEncoding: 'json' })
    , usersMeta     =  db.sublevel(github.usersMeta, { valueEncoding: 'json' })
    , byOwner       =  db.sublevel(github.byOwner,   { valueEncoding: 'utf8' })
    , sublevels     =  {
        githubRepos   :  githubRepos
      , githubUsers   :  githubUsers
      , githubStarred :  githubStarred
      , usersMeta     :  usersMeta
      , byOwner       :  byOwner
      }
    , data
    ;

  try {
    var parsed = JSON.parse(json);
    data = structure(parsed);
  } catch (e) { return cb(e); }

  createBatch(data, username, githubRepos, githubUsers, githubStarred, usersMeta, byOwner, function (batch) {
    db.batch(batch, function (err) {
      cb(err, { sublevels: sublevels, remaining: data.remaining });  
    });
  });
};
