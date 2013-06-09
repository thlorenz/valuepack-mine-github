'use strict';

var github = require('valuepack-core/mine/namespaces').github;

var store = module.exports = function (db, json, cb) {
  var githubRepos =  db.sublevel(github.repos, { valueEncoding: 'json' })
    , byOwner     =  db.sublevel(github.byOwner, { valueEncoding: 'utf8' })
    , sublevels   =  {
        githubRepos :  githubRepos
      , byOwner     :  byOwner
      }
    , repos;

  try {
    repos = JSON.parse(json);
  } catch (e) { cb(e); }

  var batch = repos
    .filter(function (r) {
      return !r.fork 
          && ~[ 'JavaScript', 'CoffeeScript' ].indexOf(r.language);
    })
    .map(function (r) {
      return {
          type: 'put'
        , key:  r.full_name
        , value: {
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

  githubRepos.pre(function (val, add) {
    add({ prefix :  byOwner
        , type   :  'put'
        , key    :  val.value.owner + '\xff' + val.value.name
        , value  :  val.key });
  });

  githubRepos.batch(
      batch
    , function (err) { cb(err, sublevels) }
  );
};

var json = require('fs').readFileSync(__dirname + '/../data/isaacs.json', 'utf8')
var obj = JSON.parse(json)
