'use strict';

var updateRepos  =  require('./update-github-repos')
  , sublevels    =  require('valuepack-core/mine/sublevels')
  , asyncreduce  =  require('asyncreduce')
  , log          =  require('valuepack-core/util/log')
  , EventEmitter =  require('events').EventEmitter
  , calcWait     =  require('../lib/calc-wait')
  , setImmediate =  setImmediate || setTimeout // node 0.8 compat


var update = module.exports = function (db, users, opts) {
  var events = new EventEmitter()
    , hour = 60 * 60 * 1000
    , totalUsers = users.length

  opts = opts || {};

 // wait a minute longer by default to be safe
  var timeout       = typeof opts.timeout      === 'undefined' ? hour + 60000 : opts.timeout
    , minRemaining  = typeof opts.minRemaining  === 'undefined' ? 300   : opts.minRemaining
    , concurrency   = typeof opts.concurrency   === 'undefined' ? 20    : opts.concurrency
    , active = 0
    , activeUsers = {}
    , smallestRemaining
    , ended
    , paused
    , started;

  function removeExistingNstart() {
    var subgithub = sublevels(db).github;
    var subGithubUsers = subgithub.users;

    asyncreduce(
        users
      , []
      , function (acc, user, cb) {
          subGithubUsers.get(user, function (err) {
            if (err) acc.push(user);
            cb(null, acc);
          });
        }
      , function (err, acc) {
          if (err) events.emit('error', err);

          log.info(__filename, 'Updating only %d/%d users since the remaining ones already existed', acc.length, totalUsers)

          users = acc;
          totalUsers = users.length;
          start();
      }
    );
  }

  function start() {
    started = Date.now();
    paused = false;
    ended = false;
    smallestRemaining = 5000;

    updateUsers();
  }

  function updateUsers() {

    var nextUser = users.shift();

    if (!nextUser) {
      if(active || ended) return;
      ended = true;

      return events.emit('end');
    }
    log.info(__filename, 'updating: ', nextUser);

    active++;
    activeUsers[nextUser] = true;

    // add more requests in case we are operating below concurrency
    if (active < concurrency && !paused) setTimeout(updateUsers);

    updateRepos(db, nextUser, function (err, res) {
      active--;
      delete activeUsers[nextUser];
      if (err) {
        // TODO: updateRepos need to pass on below error in order to pause for an hour
        // if (/API rate limit exceeded/.test(error.message
        events.emit('error', err);
        return setTimeout(updateUsers);
      }
      
      // in case structuring and storing the response failed we just move on
      if (!res) return setTimeout(updateUsers);

      events.emit(
          'stored'
        , { user: nextUser
          , remaining: res.remaining
          , modifieds: res.modifieds
          }
      );

      log.silly(__filename, 'pending users', Object.keys(activeUsers).join(':'));

      smallestRemaining = Math.min(smallestRemaining, res.remaining);

      if (smallestRemaining < minRemaining) {
        if (paused) return;
        var wait = calcWait(started, timeout);
        var minutes = wait / 60000;
        events.emit('pause', wait);
        paused = true;
        log.info(__filename, 'Updated %d/%d users. Waiting %d ms (%d mins) to continue.', totalUsers - users.length, users.length, wait, minutes);
        return setTimeout(start, wait);
      }

      setImmediate(updateUsers);
    });
  }

  if (!opts.skipExistingLogins) setImmediate(start);
  else setImmediate(removeExistingNstart)

  return events;
};
