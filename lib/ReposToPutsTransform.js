'use strict';

var util              =  require('util')
  , stream            =  require('stream')
  , Transform         =  stream.Transform
  , batchGithubRepos  =  require('./batch-github-repos')

module.exports = ReposToPutsTransform;

util.inherits(ReposToPutsTransform, Transform);

function ReposToPutsTransform (db, opts) {
  if (!(this instanceof ReposToPutsTransform)) return new ReposToPutsTransform(db, opts);

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
    if (put.prefix) {
      var options = put.prefix.options;
      var pre = put.prefix._prefix;
      put.key = options.sep + pre + options.sep + put.key;
      if (options.valueEncoding && options.valueEncoding.length) put.valueEncoding = options.valueEncoding;
    }
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
