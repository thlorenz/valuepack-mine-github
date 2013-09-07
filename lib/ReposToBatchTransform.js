'use strict';

var util              =  require('util')
  , stream            =  require('stream')
  , Transform         =  stream.Transform
  , batchGithubRepos  =  require('./batch-github-repos')

module.exports = ReposToBatchTransform;

util.inherits(ReposToBatchTransform, Transform);

function ReposToBatchTransform (db, opts) {
  if (!(this instanceof ReposToBatchTransform)) return new ReposToBatchTransform(db, opts);

  opts = opts || {};
  opts.objectMode = true;
  Transform.call(this, opts);

  this.db = db;
  this.events = opts.events;
}

ReposToBatchTransform.prototype._transform = function (info, encoding, cb) {
  var self = this;
  var data = info.data;
  var login = info.login;

  self.events.emit('batching', login);

  batchGithubRepos(this.db, data, login, onbatch);
  function onbatch (err, res) {
    if (err) {
      self.events.emit('error', { error: err, context: 'batching ' + login });
      // drop this response
    } else {
      self.events.emit('batched', res.info);
      self.push(res.batch);
    }
    cb();
  }
}
