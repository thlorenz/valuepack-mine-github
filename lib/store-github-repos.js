'use strict';

var github = require('valuepack-core/mine/namespaces').github;

function resolveUserId (uname, repos) {
  for (var i = 0; i < repos.length; i++) {
    var r = repos[i];
    if (r.owner && r.owner.login === uname && r.owner.id) 
      return r.owner.id;
  }
}

function structure (parsed) {
  var reposRes          =  parsed.repos
    , userRes           =  parsed.user
    , reposModified     =  reposRes.modified
    , userModified      =  userRes.modified
    , reposLastModified =  reposRes.headers.lastModified
    , userLastModified  =  userRes.headers.lastModified
    , remaining         =  Math.min(reposRes.headers.remaining, userRes.headers.remaining);

  var userMetadata = {
      name                :  parsed.username
    , detailsLastModified :  userLastModified
    , reposLastModified   :  reposLastModified
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

  if (repos && repos.length && userData) {
    var id = resolveUserId(userData.name, repos);
    if (id) userData.id = id;
  }

  return {
      userData      :  userData
    , userMetadata  :  userMetadata
    , repos         :  repos
    , userModified  :  userModified
    , reposModified :  reposModified
    , remaining     :  remaining
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

function createBatch (data, githubRepos, githubUsers, usersMeta, byOwner, cb) {
  var batch = [];

  var meta = data.userMetadata;
  batch.push({ type: 'put' , prefix: usersMeta, key: meta.name, value: meta });

  if (data.reposModified) { 
    batch = batch.concat(getRepoBatch(data.repos, githubRepos));
    addByOwnerHook(githubRepos, byOwner);
  }

  if (!data.userModified) return cb(batch);

  // handle user data
  var user = data.userData;
  if (user.id) {
    batch.push({ type: 'put' , prefix: githubUsers, key: user.name, value: user });
    return cb(batch);
  } 

  // updated user, but not repos (which we use to find user id), so try to find existing user in order to preserve id
  githubUsers.get(user.name, function (err, u) {
    if (!err && u) user.id = u.id;
    batch.push({ type: 'put' , prefix: githubUsers, key: user.name, value: user });
    cb(batch);
  })
}

var store = module.exports = function (db, json, cb) {
  var githubRepos =  db.sublevel(github.repos,     { valueEncoding: 'json' })
    , githubUsers =  db.sublevel(github.users,     { valueEncoding: 'json' })
    , usersMeta   =  db.sublevel(github.usersMeta, { valueEncoding: 'json' })
    , byOwner     =  db.sublevel(github.byOwner,   { valueEncoding: 'utf8' })
    , sublevels   =  {
        githubRepos :  githubRepos
      , githubUsers :  githubUsers
      , usersMeta   :  usersMeta
      , byOwner     :  byOwner
      }
    , data
    ;

  try {
    var parsed = JSON.parse(json);
    data = structure(parsed);
  } catch (e) { return cb(e); }

  createBatch(data, githubRepos, githubUsers, usersMeta, byOwner, function (batch) {
    db.batch(batch, function (err) {
      cb(err, { sublevels: sublevels, remaining: data.remaining });  
    });
  });
};
