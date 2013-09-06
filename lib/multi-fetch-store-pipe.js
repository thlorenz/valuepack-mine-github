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

// Batch
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

// Chunks
util.inherits(PutsToSizedBatchesTransform, Transform);

function PutsToSizedBatchesTransform (opts, limit) {
  opts = opts || {};

  this.limit = limit || 4 * 1024 * 1024; // 4MB by default
  this.size = 0;
  this.batch = []

  opts.objectMode = true;
  opts.highWaterMark = this.limit * 2;
  Transform.call(this, opts);
}

PutsToSizedBatchesTransform.prototype.getByteLength = function (put) {
  var limit = this.limit;

  function getLen (put) {
    var len = put.length
    if (len) return len
    try {
      return JSON.stringify(put).length
    } catch (e) {
      // if we can't determine length properly assume that it is big
      return limit
    }
  }
  return getLen(put.key) + getLen(put.value);
}

PutsToSizedBatchesTransform.prototype.pushBatch = function () {
  log.verbose(__filename, 'pushing batch with %d puts and size %d', this.batch.length, this.size);
  var batch = this.batch;
  this.push(batch);
  this.size = 0;
  this.batch = [];
}

PutsToSizedBatchesTransform.prototype._transform = function (put, encoding, cb) {
  var len = this.getByteLength(put);

  if ((this.size + len) >= this.limit) {
    // if single obj is bigger than limit
    if (this.size === 0) {
      this.batch.push(put);
      this.pushBatch();
    } else {
      // queue current batch and batch obj again to have it added to next batch 
      this.pushBatch();
      // TODO:
      //setImmediate(this._transform.bind(this, put));
    }
  } else {
    this.batch.push(put);
    this.size += len;
    log.verbose(__filename, 'size: %d, limit: %d, limit - size: %d', this.size, this.limit, this.limit - this.size);
  }
  cb();
}

PutsToSizedBatchesTransform.prototype._flush = function (cb) {
  if (this.batch.length) this.pushBatch();
  cb();
}

var go = module.exports = function (db, logins) {
  var events = new EventEmitter()

  var loginStream    =  new ArrayReadable(logins);
  var reposTransform =  new LoginToReposTransform(db);
  var putsTransform  =  new ReposToPutsTransform(db);
  var batchTransform =  new PutsToSizedBatchesTransform();
  var inflight       =  false;

  var batchStream = loginStream
    .pipe(reposTransform)
    .pipe(putsTransform)
    .pipe(db.createWriteStream());

 /*  This manual batching is a lot slower and takes a lot more memory than just piping the puts
  *  into a writeStream like I'm doing now.
  *  The batch sizes are optimized to be just below the writeBufferSize (see PutsToSizedBatchesTransform), which should be optimal
  *  for batching puts.
  *  I'm not sure why a batch (which is optimized) is behaving worse than writeStream which itself
  *  batches under the hood anyways, but in this case much smaller batches.
  *
    .pipe(batchTransform)

  batchStream.once('readable', onreadable);

  function onreadable () {
    // avoid multi entry
    if (inflight) return;

    inflight = true;

    if (!batchStream.readable) { 
      inflight = false;
      return batchStream.once('readable', onreadable);
    }

    var batch = batchStream.read();

    if (!batch) {
      inflight = false;
      return batchStream.once('readable', onreadable);
    }

    db.batch(batch, function (err) {
      if (err) log.error(__filename, err);
      log.info(__filename, 'stored batch with length', batch.length);
      inflight = false;
      setImmediate(onreadable);         
    });
  }*/

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
