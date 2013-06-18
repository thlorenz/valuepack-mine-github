'use strict';

var github =  require('valuepack-core/mine/namespaces').github
  , query  =  require('./client-id-secret-query')
  , fetch  =  require('./fetch-github-repos')
  , store  =  require('./store-github-repos');

var update = module.exports = function (db, username, cb) {
  var usersMeta = db.sublevel(github.usersMeta, { valueEncoding: 'json' });

  usersMeta.get(username, function (err, meta) {
    if (err) {
      // we expect a not found here if the user is not in the db yet
      if (err.name !== 'NotFoundError') return console.error(err);
      meta = {};
    }

    fetch(
      { user                :  username
      , getUserDetails      :  true
      , getUserStarred      :  true
      , query               :  query
      , userLastModified    :  meta.detailsLastModified || new Date(0)
      , reposLastModified   :  meta.reposLastModified   || new Date(0)
      , starredLastModified :  meta.starredLastModified || new Date(0)
      }
    , function fetched (err, res) {
        if (err) return console.error(err)
        store(db, res, username, cb);
      }
    );
  });
};
