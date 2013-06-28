#!/usr/bin/env node

'use strict';
/*jshint asi:true */

var fetch =  require('../lib/fetch-github-repos')
  , query =  require('../lib/client-id-secret-query')
  , argv = process.argv
  , details = true
  , starred = true

var detailsIdx = argv.indexOf('--nodetails')
if (~detailsIdx) {
  details = false
  argv.splice(detailsIdx, 1)
}

var starredIdx = argv.indexOf('--nostarred')
if (~starredIdx) {
  starred = false
  argv.splice(starredIdx, 1)
}

var user = argv[2]

if(!user) {
  console.error('Usage: ./fetch-github-repos isaacs [--nodetails] [-nostarred]')
  process.exit(1)
}

function including(b) {
  return b ? 'including' : 'excluding'
}

console.error('Getting repos for: %s %s user details and %s starred repos ', user, including(details), including(starred));
fetch(
    { user           :  user
    , getUserDetails :  details
    , getUserStarred :  starred
    , query          :  query
    }
  , function (err, res) {
      if (err) return console.error(err)

      console.log(JSON.stringify(res, null, 2));
  });
