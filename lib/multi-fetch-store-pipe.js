'use strict';

var util              =  require('util')
  , stream            =  require('stream')
  , Transform         =  stream.Transform
  , Readable          =  stream.Readable
  , EventEmitter      =  require('events').EventEmitter
  , log               =  require('valuepack-core/util/log')
  , fetchGithubUpdate =  require('./fetch-github-update')
  , batchGithubRepos  =  require('./batch-github-repos')
  ;

// Logins
util.inherits(ArrayReadable, Readable);

function ArrayReadable (items, opts) {
  opts = opts || {};
  opts.objectMode = true;
  Readable.call(this, opts);
  this.items = items;
}

ArrayReadable.prototype._read = function () {
  this.push(this.items.pop());
}


// Repos
util.inherits(LoginToReposTransform, Transform);

function LoginToReposTransform (db, opts) {
  opts = opts || {};
  opts.objectMode = true;
  Transform.call(this, opts);

  this.db = db;
}

LoginToReposTransform.prototype._transform = function (login, encoding, cb) {
  var self = this;

  log.info(__filename, 'fetching github update for', login);
  fetchGithubUpdate(this.db, login, onupdate);
  function onupdate (err, res) {
    if (err) {
      log.error(__filename, err)
      log.error(__filename, 'while fetching ', login);
      // drop this login
    } else {
      self.push(res);
    }
    cb();
  }
}

// Puts
util.inherits(ReposToPutsTransform, Transform);

function ReposToPutsTransform (db, opts) {
  opts = opts || {};
  opts.objectMode = true;
  Transform.call(this, opts);

  this.db = db;
}

ReposToPutsTransform.prototype._transform = function (res, encoding, cb) {
  var self = this;
  var login = res.username;

  function pushPut(put) { self.push(put) }

  log.verbose(__filename, 'batching structured repo data for', login);

  batchGithubRepos(this.db, res, login, onbatch);
  function onbatch (err, res) {
    if (err) {
      log.error(__filename, err)
      log.error(__filename, 'while batching ', login);
      // drop this response
    } else {
      log.info(__filename, 'batched', login);
      log.info(__filename, 'state', res.info);
      res.batch.forEach(pushPut);
    }
    cb();
  }
}


var go = module.exports = function (db, logins) {
  var events = new EventEmitter()

  var loginStream    =  new ArrayReadable(logins);
  var reposTransform =  new LoginToReposTransform(db);
  var putsTransform  =  new ReposToPutsTransform(db);

  var batchStream = loginStream
    .pipe(reposTransform)
    .pipe(putsTransform)
    .pipe(db.createWriteStream());

  // TODO: emit some
  return events;
};

// Test
if (!module.parent) {
  log.level = 'silly';

  var tap = require('tap-stream')
  var leveldb = require('valuepack-core/mine/leveldb')
  leveldb.open(function (err, db) {
    if (err) return console.error(err);
    var logins         =  ['thlorenz', 'danielmoore'];
    go(db, logins);
  });
}
