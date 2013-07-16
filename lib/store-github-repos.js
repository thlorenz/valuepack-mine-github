'use strict';

var github = require('valuepack-core/mine/namespaces').github
  , structure = require('./structure-parsed-responses');

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

  // starred may have been modified, but if user starred too many repos the starred data will be set to null
  // see 'structure-parsed-responses'
  if (data.starredModified && data.starredData) {
    batch.push({ type: 'put', prefix: githubStarred, key: username, value: data.starredData});
  }

  if (!data.userModified) return cb(null, batch);

  var user = data.userData;
  if (user.name !== username)
    return cb(new Error('Given username: %s and username in userdata: %s do not match!', username, user.name));

  if (user.id) {
    batch.push({ type: 'put' , prefix: githubUsers, key: username, value: user });
    return cb(null, batch);
  }

  // updated user, but not repos (which we use to find user id), so try to find existing user in order to preserve id
  githubUsers.get(user.name, function (err, u) {
    if (!err && u) user.id = u.id;
    batch.push({ type: 'put' , prefix: githubUsers, key: user.name, value: user });
    cb(null, batch);
  })
}

var store = module.exports = function (db, response, username, cb) {
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
    data = structure(response, username);
  } catch (e) { return cb(e); }

  createBatch(data, username, githubRepos, githubUsers, githubStarred, usersMeta, byOwner, function (err, batch) {
    if (err) return cb(err);
    db.batch(batch, function (err) {
      cb(
        err
      , { sublevels :  sublevels
        , remaining :  data.remaining
        , modifieds :  {
            reposModified   :  data.reposModified
          , userModified    :  data.userModified
          , starredModified :  data.starredModified
          }
        }
      );
    });
  });
};
