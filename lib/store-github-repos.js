'use strict';

var github    =  require('valuepack-core/mine/namespaces').github
  , sublevels =  require('valuepack-core/mine/sublevels')
  , structure =  require('./structure-parsed-responses')
  , batcher   =  require('level-batcher')
  , through   =  require('through')
  , log       =  require('valuepack-core/util/log')
  ;

function createRepoBatch (repos, githubRepos) {
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
    });
}

function addByOwnerHook(githubRepos, byOwner) {
  githubRepos.pre(function (val, add) {
    add({ prefix :  byOwner
        , type   :  'put'
        , key    :  val.value.owner + '\xff' + val.value.name
        , value  :  val.key });
  });
}

function createBatch (data, username, subgithub, chunker, cb) {
  var batch = [];

  var meta = data.userMetadata;

  batch.push({ type: 'put' , prefix: subgithub.usersMeta, key: meta.name, value: meta });

  if (data.reposModified) {
    batch = batch.concat(createRepoBatch(data.repos, subgithub.repos, chunker));
    addByOwnerHook(subgithub.repos, subgithub.byOwner);
  }

  // starred may have been modified, but if user starred too many repos the starred data will be set to null
  // see 'structure-parsed-responses'
  if (data.starredModified && data.starredData) {
    batch.push({ type: 'put', prefix: subgithub.starred, key: username, value: data.starredData});
  }

  if (!data.userModified) return cb(null, batch);

  var user = data.userData;
  if (user.name !== username)
    return cb(new Error('Given username: %s and username in userdata: %s do not match!', username, user.name));

  if (user.id) {
    batch.push({ type: 'put' , prefix: subgithub.users, key: username, value: user });
    return cb(null, batch);
  }

  // updated user, but not repos (which we use to find user id), so try to find existing user in order to preserve id
  subgithub.users.get(user.name, function (err, u) {
    if (!err && u) user.id = u.id;
    batch.push({ type: 'put' , prefix: subgithub.users, key: user.name, value: user });
    cb(null, batch);
  })
}



var store = module.exports = function (db, response, username, cb) {
  var subgithub = sublevels(db).github
    , data
    , chunker = batcher()
    ;

  try {
    data = structure(response, username);
    if (!data) { 
      log.warn('store-github-repos', 'Most likely response was empty because structuring returned nothing for', response);
      return cb();
    }
  } catch (e) { return cb(e); }

  log.verbose(__filename, 'storing structured repo data for', username);

  var res = { 
      remaining :  data.remaining
    , modifieds :  {
        reposModified   :  data.reposModified
      , userModified    :  data.userModified
      , starredModified :  data.starredModified
      }
    };

  chunker
    .pipe(through(write, end))
    .on('error', function (err) {
      log.error(__filename, err); 
    })

  function write (chunk) {
    db.batch(chunk, chunker.next.bind(chunker));
  }

  function end () {
    cb(null, res);
  }

  createBatch(data, username, subgithub, chunker, function (err, batch) {
    if (err) return cb(err);
    chunker.end();
  });

  // while batching is going on, we don't need to hang on to the entire data -- lets keep memory footprint low ;)
  data = null;
  subgithub = null;
};
