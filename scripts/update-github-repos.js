#!/usr/bin/env node

'use strict';

var leveldb  =  require('valuepack-core/mine/leveldb')
  , update   =  require('../lib/update-github-repos')
  , argv     =  process.argv
  , username =  argv[2];

if (!username) {
  console.error('Usage: update-github-repos <username>');
  process.exit(1);
}

leveldb.open(function (err, db) {
  if (err) return leveldb.close(err);
  db = require('level-sublevel')(db);
  update(db, username, function (err, res) {
    if (err) return console.error(err);
    console.error('remaining', res.remaining);
    leveldb.close();
  });
})
