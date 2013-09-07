'use strict';

var util              =  require('util')
  , stream            =  require('stream')
  , Transform         =  stream.Transform
  , Readable          =  stream.Readable
  , Writable          =  stream.Writable
  , EventEmitter      =  require('events').EventEmitter
  , log               =  require('valuepack-core/util/log')
  , sublevels         =  require('valuepack-core/mine/sublevels')
  , asyncreduce       =  require('asyncreduce')
  , fetchGithubUpdate =  require('./fetch-github-update')
  , batchGithubRepos  =  require('./batch-github-repos')
  , calcWait          =  require('./calc-wait')
  , structure         =  require('./structure-parsed-responses')
  ;

// Logins
util.inherits(ArrayReadable, Readable);

function ArrayReadable (items, opts) {
  opts = opts || {};
  opts.objectMode = true;
  Readable.call(this, opts);
  this.items = items;
  this.events = opts.events;
}

ArrayReadable.prototype._read = function () {
  if (this.waiting) return;
  this.push(this.items.pop());
}

// Repos
util.inherits(LoginToReposTransform, Transform);

var hour = 60 * 60 * 1000;
function LoginToReposTransform (db, opts) {
  opts = opts || {};
  opts.objectMode = true;

  this.db                =  db;
  this.loginStream       =  opts.loginStream;
  this.events            =  opts.events;
  this.waitTime          =  opts.waitTime || hour;
  this.minRemaining      =  opts.minRemaining || 20;
  this.smallestRemaining =  5000;
  this.start();

  Transform.call(this, opts);
}

LoginToReposTransform.prototype.start = function () {
  this.started = Date.now();
  this.events.emit('start');
  this.emit('start');
}

LoginToReposTransform.prototype.wait = function (waitTime) {
  var timeToWait = calcWait(this.started, this.waitTime);

  this.events.emit('wait', timeToWait);
  setTimeout(this.start.bind(this), timeToWait);
}

LoginToReposTransform.prototype._transform = function (login, encoding, cb) {
  var self = this;

  function resumeSource () { self.source.resume() }

  function process () {
    self.events.emit('fetching', login);
    fetchGithubUpdate(self.db, login, onupdate);
  }

  function onupdate (err, res) {
    if (err) {
      self.events.emit('error', { error: err, context: 'fetching ' + login });
      return cb()
    }
    var data;
    try {
      data = structure(res, login);
      if (!data) {
        self.events.emit('warn', { warn: 'Most likely response was empty because structuring returned nothing for response', context: res });
        return cb();
      }
    } catch (e) {
      self.events.emit('error', { error: e, context: 'structuring data for ' + login });
      return cb();
    }

    self.push({ data: data, login: login });
    self.minRemaining = Math.min(self.minRemaining, data.remaining);

    cb();
  }

  var runningOutOfRequests = self.smallestRemaining < self.minRemaining;
  if (!runningOutOfRequests) return process();

  this.wait();
  this.once('start', process);

}

// Puts
util.inherits(ReposToPutsTransform, Transform);

function ReposToPutsTransform (db, opts) {
  opts = opts || {};
  opts.objectMode = true;
  Transform.call(this, opts);

  this.db = db;
  this.events = opts.events;
}

ReposToPutsTransform.prototype._transform = function (info, encoding, cb) {
  var self = this;
  var data = info.data;
  var login = info.login;

  function pushPut(put) { 
    self.push(put) 
  }

  self.events.emit('batching', login);

  batchGithubRepos(this.db, data, login, onbatch);
  function onbatch (err, res) {
    if (err) {
      self.events.emit('error', { error: err, context: 'batching ' + login });
      // drop this response
    } else {
      self.events.emit('batched', res.info);
      res.batch.forEach(pushPut);
    }
    cb();
  }
}

function removeExistingLogins(db, logins, events, cb) {
  var subgithub = sublevels(db).github;
  var subGithubUsers = subgithub.users;

  asyncreduce(
      logins
    , []
    , function (acc, login, cb_) {
        subGithubUsers.get(login, function (err) {
          if (err) acc.push(login);
          cb_(null, acc);
        });
      }
    , function onremoved (err, acc) {
        if (err) events.emit('error', err);
        log.info(__filename, 'Updating only %d/%d users since the remaining ones already existed', acc.length, logins.length)
        cb(acc);
      }
 
  );
}


var go = module.exports = function (db, logins, skipExisting) {
  var events = new EventEmitter()

  function start (logins_) {

    var loginStream    =  new ArrayReadable(logins_, { events: events });
    var reposTransform =  new LoginToReposTransform(db, { events: events, loginStream: loginStream, waitTime: hour });
    var putsTransform  =  new ReposToPutsTransform(db, { events: events });
    var writeStream    =  db.createWriteStream();

    var batchStream = loginStream
      .pipe(reposTransform)
      .pipe(putsTransform)
      .pipe(tap())
      .on('end', events.emit.bind(events, 'end'))
      .pipe(writeStream)
  }


  if (skipExisting) removeExistingLogins(db, logins, events, start);
  else              start(logins);

  return events;
};

// Test
if (!module.parent) {
  log.level = 'silly';

  var tap = require('tap-stream')
  var leveldb = require('valuepack-core/mine/leveldb')
  leveldb.open(function (err, db) {
    if (err) return console.error(err);
    var logins = ['thlorenz'] //['domenic', 'thej', 'thlorenz', 'danielmoore' ];
    var events = go(db, logins, true);

    events
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
        log.info('mine-github', 'done, closing db');
        // This throws 'database is not open and is not catchable
        // if (db.isOpen()) db.close(function () {});
      });
  });
}
