'use strict';

var github =  require('valuepack-core/mine/namespaces').github
  , query  =  require('./client-id-secret-query')
  , fetch  =  require('./fetch-github-repos')
  , store  =  require('./store-github-repos');

var update = module.exports = function (db, username, cb) {
  var usersMeta = db.sublevel(github.usersMeta, { valueEncoding: 'json' });

  usersMeta.get(username, function (err, res) {
    if (err) {
      // we expect a not found here if the user is not in the db yet
      if (err.name !== 'NotFoundError') return console.error(err);
      res = {};
    }

    fetch(
      { user              :  username
      , getUserDetails    :  true
      , query             :  query
      , userLastModified  :  res.detailsLastModified || new Date(0)
      , reposLastModified :  res.reposLastModified   || new Date(0)
      }
    , function fetched (err, res) {
        if (err) return console.error(err)
        store(db, JSON.stringify(res), cb);
      }
    );
  });
};
