'use strict';

var leveldb             =  require('valuepack-core/mine/leveldb')
  , updateMultipleUsers =  require('./lib/update-multiple-github-users')

module.exports = exports = function (usernames, cb) {
  leveldb.open(function (err, db) {
    if (err) return leveldb.close(err);
    db = require('level-sublevel')(db);

    updateMultipleUsers(db, usernames, function (err, res) {
      if (err) return console.error(err);
    })
    .on('error', function (err) {
      console.error(err);
      console.error(err.stack);
    })
    .on('stored', function (info) {
      console.log('stored\n', info);  
    })
    .on('pause', function (timeout) {
      console.log('ran out of requests, pausing for %sms', timeout)  
    })
    .on('end', function () {
      leveldb.close();
      cb();
    });
  });
};

exports.updateMultipleUsers =  updateMultipleUsers;
exports.fetchGithubRepos    =  require('./lib/fetch-github-repos');
exports.storeGithubRepos    =  require('./lib/store-github-repos');
exports.updateGithubRepos   =  require('./lib/update-github-repos');
exports.clientIdSecretQuery =  require('./lib/client-id-secret-query');
