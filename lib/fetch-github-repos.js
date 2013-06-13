'use strict';

var request         =  require('request')
  , xtend           =  require('xtend')
  , requestAllPages =  require('request-all-pages')
  , handlePages     =  require('./handle-pages')
  , fetch           =  require('./fetch');


function repos(options, cb) {
  fetch(options, options.reposLastModified, 'repos', cb);
}

function userDetails(options, cb) {
  fetch(options, options.userLastModified, 'followers', cb);
}

/**
 * @param opts {Object} { getUserDetails: true|false (if true user info, i.e. followers will be included), query: maybe empty }
 * @param cb  
 */
var get = module.exports = function (opts, cb ) {
  var tasks = opts.getUserDetails ? 2 : 1
    , data = { username: opts.user }
    , error;

  opts = xtend(opts, { startPage: 1, perPage: 100 });

  repos(opts, function (err, res) {
    if (error) return;
    if (err) return cb(error = err);
    data.repos = res;
    data.remaining = res.remaining;

    if (!--tasks) cb(null, data);
  });

  if (opts.getUserDetails) {
    userDetails(opts, function (err, res) {
      if (error) return;
      if (err) return cb(error = err);

      var body = res.body;
      data.user = res;
      data.user.body = { followers: body };
      data.remaining = res.remaining;

      if (!--tasks) cb(null, data);
    });
  }
};
