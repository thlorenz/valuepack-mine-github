'use strict';

var github =  require('valuepack-core/mine/namespaces').github
  , query  =  require('./client-id-secret-query')
  , fetch  =  require('./fetch-github-repos')
  , store  =  require('./store-github-repos');

var update = module.exports = function (db, username, cb) {
  var usersMeta = db.sublevel(github.usersMeta, { valueEncoding: 'json' });

  function fetched (err, res) {
    if (err) return console.error(err)
    store(db, JSON.stringify(res), function (err, res) {
      if (err) return console.error(err)
      console.log('done');
    });
  }

  usersMeta.get(username, function (err, res) {
    if (err) return console.error(err);

    fetch(
      { user              :  username
      , getUserDetails    :  true
      , query             :  query
      , userLastModified  :  res.detailsLastModified
      , reposLastModified :  res.reposLastModified
      }
    , fetched);
  });
};

var username = 'thlorenz'
  , leveldb  =  require('valuepack-core/mine/leveldb')

leveldb.open(function (err, db) {
  if (err) return leveldb.close(err);
  db = require('level-sublevel')(db);
  update(db, username, leveldb.close);
})
