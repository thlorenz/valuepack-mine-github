'use strict';

var github =  require('valuepack-core/mine/namespaces').github
  , log    =  require('valuepack-core/util/log')
  , query  =  require('./client-id-secret-query')
  , fetch  =  require('./fetch-github-repos')
  , store  =  require('./store-github-repos');

var update = module.exports = function (db, username, cb) {
  var usersMeta = db.sublevel(github.usersMeta, { valueEncoding: 'json' });

  usersMeta.get(username, function (err, meta) {
    if (err) {
      // we expect a not found here if the user is not in the db yet
      if (err.name !== 'NotFoundError') return log.error('update-github-repos', err);
      meta = {};
    }
    var fetchOpts = { 
        user                :  username
      , getUserDetails      :  true
      , getUserStarred      :  true
      , query               :  query
      , userLastModified    :  meta.detailsLastModified || new Date(0)
      , reposLastModified   :  meta.reposLastModified   || new Date(0)
      , starredLastModified :  meta.starredLastModified || new Date(0)
    };
    fetch(fetchOpts, cb);
  });
};
