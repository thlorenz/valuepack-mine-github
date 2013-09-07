'use strict';

var util              =  require('util')
  , stream            =  require('stream')
  , Writable          =  stream.Writable

module.exports = SyncBatchWriter;

util.inherits(SyncBatchWriter, Writable);
function SyncBatchWriter (db, opts) {
  if (!(this instanceof SyncBatchWriter)) return new SyncBatchWriter(db, opts);

  opts = opts || {};
  opts.objectMode = true;

  Writable.call(this, opts);

  this.db = db;
}

SyncBatchWriter.prototype._write = function (batch, encoding, cb) {
  this.db.batch(batch, { sync: true }, cb);
}
