#!/usr/bin/env node

'use strict';
/*jshint asi: true */

var leveldb       =  require('valuepack-core/mine/leveldb')
  , storeRepos    =  require('./store-github-repos')

function rebuild() {
  leveldb.destroy(function (err) {
    if (err) return console.error(err)
    console.log('destroyed db')

    leveldb.open(function (err, db) {
      if (err) return leveldb.close(err, db);

      storeRepos(db, function (err, db) {
        if (err) return leveldb.close(err, db);
        
        leveldb.close(err, db)
      })
    })
  })
}

rebuild()
