'use strict';

var github = require('valuepack-core/mine/namespaces').github;

function structure (parsed) {
  var reposRes          =  parsed.repos
    , userRes           =  parsed.user
    , reposModified     =  reposRes.modified
    , userModified      =  userRes.modified
    , reposLastModified =  reposRes.headers.lastModified
    , userLastModified  =  userRes.headers.lastModified
    , remaining         =  Math.min(reposRes.headers.remaining, userRes.headers.remaining);

  var userData = userModified 
    ? { name           :  parsed.username
      , followers      :  userRes.body.followers
      , followersCount :  userRes.body.followers.length
      }
    : null;

  var userMetadata = {
      name                :  parsed.username
    , detailsLastModified :  userLastModified
    , reposLastModified   :  reposLastModified
  };

  var repos = reposModified ? reposRes.body : null;

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

var store = module.exports = function (db, json, cb) {
  var githubRepos =  db.sublevel(github.repos, { valueEncoding: 'json' })
    , githubUsers =  db.sublevel(github.users, { valueEncoding: 'json' })
    , usersMeta   =  db.sublevel(github.usersMeta, { valueEncoding: 'json' })
    , byOwner     =  db.sublevel(github.byOwner, { valueEncoding: 'utf8' })
    , sublevels   =  {
        githubRepos :  githubRepos
      , githubUsers :  githubUsers
      , byOwner     :  byOwner
      }
    , data
    , batch = []
    , tasks = []
    ;

  try {
    var parsed = JSON.parse(json);
    data = structure(parsed);
  } catch (e) { cb(e); }

  if (data.reposModified) { 
    batch = batch.concat(getRepoBatch(data.repos, githubRepos));
  }
  if (data.userModified) {
    var user = data.userData;
    batch.push({ type: 'put' , prefix: githubUsers, key: user.name, value: user });
  }

  var meta = data.userMetadata;
  batch.push({ type: 'put' , prefix: usersMeta, key: meta.name, value: meta });

  db.batch(batch, function (err) {
    cb(err, sublevels);  
  });
};
