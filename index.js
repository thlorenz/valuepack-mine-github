'use strict';

var leveldb             =  require('valuepack-core/mine/leveldb')
  , log                 =  require('valuepack-core/util/log')
  , multiFetchStorePipe =  require('./lib/multi-fetch-store-pipe')

/**
 * Fetches all npm users and npm package and stores them in the given db.
 * 
 * @name exports
 * @function
 * @param db {LevelDB} expected to have sublevel mixed in which is done via the leveldb.open() call
 * @param githublogins {[String]} github usernamse (logins) for which to update github
 * @param opts {Object} 
 *  - skipExistingLogins {Boolean}
 * @param cb {Function} called back with an error or a sublevel response
 */
module.exports = exports = function (db, githubLogins, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts;
   opts = null;
  }

  log.info('mine-github', 'Mining github data for %d logins', githubLogins.length, opts);

  multiFetchStorePipe(db, githubLogins, opts)
    .on('error', function (info) {
      log.error('mine-github', info.error);
      if (info.context) log.error('mine-github', info.context);
      if (!info.nostack) log.error('mine-github', info.error.stack);
    })
    .on('warn', function (info) {
      log.warn('mine-github', info.warn);
      if (info.context) log.warn('mine-github', info.context);
    })
    .on('start', function () {
      log.info('mine-github', 'starting pipe')  
    })
    .on('wait', function (timeout) {
      log.info('mine-github', 'ran out of requests, waiting for %d ms (%d mins)', timeout, timeout / 60000)  
    })
    .on('fetching', function (login) {
      log.verbose('mine-github', 'fetching github update for', login);
    })
    .on('batching', function (login) {
      log.verbose('mine-github', 'batching', login);
    })
    .on('batched', function (info) {
      log.verbose('mine-github', 'batched', info);
    })
    .on('end', function () {
      log.info('mine-github', 'done');
    })
    .on('close', function () {
      log.info('mine-github', 'db closed');
      cb();
    });
};

exports.multiFetchStorePipe =  multiFetchStorePipe;
exports.fetchGithubRepos    =  require('./lib/fetch-github-repos');
exports.storeGithubRepos    =  require('./lib/store-github-repos');
exports.updateGithubRepos   =  require('./lib/update-github-repos');
exports.clientIdSecretQuery =  require('./lib/client-id-secret-query');
