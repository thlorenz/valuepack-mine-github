#!/usr/bin/env node

'use strict';
/*jshint asi:true */

var fetch =  require('../lib/fetch-github-repos')
  , query =  require('../lib/client-id-secret-query')
  , argv = process.argv
  , details = true

var detailsIdx = argv.indexOf('--nodetails')
if (~detailsIdx) {
  details = false
  argv.slice(detailsIdx, 1)
}

var user = process.argv[2]

if(!user) {
  console.log('Usage: ./fetch-github-repos isaacs [--nodetails]')
  process.exit(1)
}

console.error('Getting repos for: %s %s user details', user, details ? 'including' : 'excluding');
fetch(
    { user           :  user
    , getUserDetails :  details
    , query          :  query
    }
  , function (err, res) {
      if (err) return console.error(err)

      console.log(JSON.stringify(res, null, 2));
  });
