#!/usr/bin/env node

'use strict';

var leveldb   =  require('valuepack-core/mine/leveldb')
  , update    =  require('../lib/update-multiple-github-users')
  , argv      =  process.argv
  , usernames =  argv.slice(2)

if (!usernames.length) {
  console.error('Usage: update-github-repos <username1> [username2...]');
  process.exit(1);
}

leveldb.open(function (err, db) {
  if (err) return leveldb.close(err);
  db = require('level-sublevel')(db);

  update(db, usernames, function (err, res) {
    if (err) return console.error(err);
  })
  .on('error', function (err) {
    console.error(err);
    console.error(err.stack);
  })
  .on('stored', function (info) {
    console.log('stored\n', info);  
  })
  .on('pause', function (timeout) {
    console.log('ran out of requests, pausing for %sms', timeout)  
  })
  .on('end', leveldb.close.bind(leveldb))
  ;
})
