
'use strict';
/*jshint asi: true */

var test     =  require('tap').test
  , fs       =  require('fs')
  , dump     =  require('level-dump')
  , level    =  require('level-test')({ mem: true })
  , sublevel =  require('level-sublevel')
  , store    =  require('../lib/store-github-repos')
  ;

// files contain the following data:
//  user with 5 followers, dwcook, tomplays, jasonkostempski, jeffchuber, daaku
//  The first file has both user repos modified and therefore stores the user id 
//  The second file stored has the following edgecase:
//    - repos were not modified and are therefore null which causes users id to be missing
//    - this test verifies that in that case the user id is preserved
var jsonWithRepos    =  fs.readFileSync(__dirname + '/fixtures/repos-isaacs.json', 'utf8')
var jsonWithoutRepos =  fs.readFileSync(__dirname + '/fixtures/repos-not-modified-isaacs.json', 'utf8')

test('\nwhen storing existing user and repos were not modified', function (t) {
  var db = sublevel(level(null, { valueEncoding: 'json' }))
  
  
  store(db, jsonWithRepos, 'isaacs', function () {
    store(db, jsonWithoutRepos, 'isaacs', function (err, res) {

        
        var users = []
        dump(
            res.sublevels.githubUsers
          , [].push.bind(users)
          , function () {
              var fst = users[0];

              t.equal(fst.key, 'isaacs', 'stores the user')
              t.equal(users.length, 1, 'stores no other user')
              t.equal(fst.value.followersCount, 5, 'correctly calculates and stores followers count')
              t.equal(fst.value.id, 9287, 'preserves user\'s id')

              t.end()
            }
        )
    })
  })
})
