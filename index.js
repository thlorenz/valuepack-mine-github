'use strict';

var leveldb             =  require('valuepack-core/mine/leveldb')
  , log                 =  require('valuepack-core/util/log')
  , updateMultipleUsers =  require('./lib/update-multiple-github-users')

/**
 * Fetches all npm users and npm package and stores them in the given db.
 * 
 * @name exports
 * @function
 * @param db {LevelDB} expected have sublevel mixed in which is done via the leveldb.open() call
 * @param githublogins {[String]} github usernamse (logins) for which to update github
 * @param cb {Function} called back with an error or a sublevel response
 */
module.exports = exports = function (db, githubLogins, cb) {
  log.info('mine-github', 'Mining github data for %d logins', githubLogins.length);

  updateMultipleUsers(db, githubLogins)
  .on('error', function (err) {
    log.error('mine-github', err);
    log.error('mine-github', err.stack);
  })
  .on('stored', function (info) {
    log.info('mine-github', 'stored\n', info);  
  })
  .on('pause', function (timeout) {
    log.info('mine-github', 'ran out of requests, pausing for %sms', timeout)  
  })
  .on('end', function () {
    leveldb.close(null, db, cb);
  });
};

exports.updateMultipleUsers =  updateMultipleUsers;
exports.fetchGithubRepos    =  require('./lib/fetch-github-repos');
exports.storeGithubRepos    =  require('./lib/store-github-repos');
exports.updateGithubRepos   =  require('./lib/update-github-repos');
exports.clientIdSecretQuery =  require('./lib/client-id-secret-query');
