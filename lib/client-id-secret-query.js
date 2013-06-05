'use strict';

var env = process.env
  , clientId = env.VALUEPACK_GITHUB_CLIENT_ID 
  , clientSecret = env.VALUEPACK_GITHUB_CLIENT_SECRET
  ;

module.exports = clientId && clientSecret
  ? '?client_id=' + clientId + '&client_secret=' + clientSecret
  : '';
