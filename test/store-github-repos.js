'use strict';
/*jshint asi: true */

var test     =  require('tap').test
  , fs       =  require('fs')
  , dump     =  require('level-dump')
  //, levelup  =  require('levelup')
  //, leveldb  =  require('level-test')('valuepack-mine-github-test-store', { valueEncoding: 'json' })
  , leveldb  =  require('valuepack-core/mine/leveldb-mem')
  , sublevel =  require('level-sublevel')
  , store    =  require('../lib/store-github-repos')

// file contains the following data:
//  user with 5 followers, dwcook, tomplays, jasonkostempski, jeffchuber, daaku
//  3 repos(1 php, 2 javascript) 
var json = fs.readFileSync(__dirname + '/fixtures/repos-isaacs.json', 'utf8')

test('\nwhen storing user with 5 followers and 3 repos one of which is php', function (t) {
  leveldb.open(function (err, db) {
    db = sublevel(db)

    
    store(db, json, function (err, res) {
      t.notOk(err, 'no error')
      
      dump.write = function (entries) {
        console.error('entries: ', entries);
      }
      dump(res.sublevels.githubRepos, function (entries) { 
        t.end()
      });
    });
    
  });
})
