'use strict';
/*jshint asi: true */

var test      =  require('tap').test
  , fs        =  require('fs')
  , dump      =  require('level-dump')
  , level     =  require('level-test')({ mem: true })
  , sublevel  =  require('level-sublevel')
  , sublevels =  require('valuepack-core/mine/sublevels')
  , store     =  require('../lib/store-github-repos')

// file contains the following data:
//  user with 5 followers, dwcook, tomplays, jasonkostempski, jeffchuber, daaku
//  3 repos(1 php, 2 javascript) 
//  4 starred repos, 2 by the github user
var json = fs.readFileSync(__dirname + '/fixtures/repos-isaacs.json', 'utf8')

test('\nwhen storing user with 5 followers and 3 repos one of which is php', function (t) {
  var db = sublevel(level(null, { valueEncoding: 'json' }))
  
  store(db, JSON.parse(json), 'isaacs', function (err, res) {
    t.plan(6)

    t.notOk(err, 'no error')
    
    t.test('\n# stores repos correctly', function (t) {
      var repos = []
      dump(
          sublevels(db).github.repos
        , [].push.bind(repos)
        , function (err) { 
            if (err) console.error(err)
            var fst = repos[0]
              , snd = repos[1]

            t.equal(fst.key, 'isaacs/abbrev-js', 'stores first JavaScript repo')
            t.deepEqual(
                fst.value
              , { name      :  'abbrev-js',
                  fullname  :  'isaacs/abbrev-js',
                  forks     :  3,
                  stars     :  21,
                  issues    :  1,
                  hasIssues :  true,
                  language  :  'JavaScript',
                  created   :  '2010-03-09T21:16:26Z',
                  updated   :  '2013-06-07T22:04:42Z',
                  owner     :  'isaacs' }
              , 'stores name, fullname, forks, stars, issues, owner and dates correctly'
            )

            t.equal(snd.key, 'isaacs/arg-parse-js', 'stores second JavaScript repo')
            t.deepEqual(
                snd.value
              , { name      :  'arg-parse-js',
                  fullname  :  'isaacs/arg-parse-js',
                  forks     :  1,
                  stars     :  4,
                  issues    :  0,
                  hasIssues :  true,
                  language  :  'JavaScript',
                  created   :  '2010-02-24T19:47:15Z',
                  updated   :  '2013-04-24T17:49:55Z',
                  owner     :  'isaacs' }
              , 'stores name, fullname, forks, stars, issues, owner and dates correctly'
            )

            t.equal(repos.length, 2, 'does not store php repo')
            t.end()
          }
      )
    })

    t.test('\n# stores user correctly', function (t) {
      var users = []
      dump(
          sublevels(db).github.users
        , [].push.bind(users)
        , function (err) {
            if (err) console.error(err);
            var fst = users[0]

            t.equal(fst.key, 'isaacs', 'stores the user')
            t.equal(users.length, 1, 'stores no other user')
            t.equal(fst.value.followersCount, 5, 'correctly calculates and stores followers count')
            t.deepEqual(
                fst.value.followers
              , [ 'dwcook', 'tomplays', 'jasonkostempski', 'jeffchuber', 'daaku' ]
              , 'stores followers names'
            )
            t.equal(fst.value.id, 9287, 'stores user\'s id')

            t.end()
          }
      )
    })

    t.test('\n# stores user starred repos correctly', function (t) {
      var starred = []
      dump(
          sublevels(db).github.starred
        , [].push.bind(starred)
        , function (err) {
            if (err) console.error(err);
            var fst = starred[0]
            
            t.equal(fst.key, 'isaacs', 'stores starred repos under user name')
            t.equal(starred.length, 1, 'stores starred repos only for that user')
            t.deepEqual(
                fst.value.repos
              , [ 'dominictarr/stream-punks', 'Raynos/routil-static' ]
              , 'adds all starred repos that are not by the user with full name'
            )
            t.equal(fst.value.count, 2, 'calculates starred repo count correctly')
            t.end()
          }
      )
    })

    t.test('\n# stores user meta data correctly', function (t) {
      var metas = []
      dump(
          sublevels(db).github.usersMeta
        , [].push.bind(metas)
        , function (err) {
            if (err) console.error(err);

            var fst = metas[0]

            t.equal(fst.key, 'isaacs', 'stores the user meta data')
            t.deepEqual(
                fst.value
              , { name                :  'isaacs',
                  detailsLastModified :  'Fri, 14 Jun 2013 00:58:14 GMT',
                  reposLastModified   :  'Fri, 14 Jun 2013 00:00:45 GMT',
                  starredLastModified :  'Mon, 14 Dec 2009 22:31:05 GMT' }
              , 'including info about last modified date of repos and user details'
            )

            t.end()
          }
      )
    })

    t.test('\n# indexes repos by owner', function (t) {
      var owners = []
      dump(
          sublevels(db).github.byOwner
        , [].push.bind(owners)
        , function (err) {
            if (err) console.error(err);

            t.deepEqual(
                owners
              , [ { key: 'isaacsÿabbrev-js'    ,  value: '"isaacs/abbrev-js"'    } ,
                  { key: 'isaacsÿarg-parse-js' ,  value: '"isaacs/arg-parse-js"' } ]
              , 'indexes both repos by the owning user'
            )

            t.end()
          }
      )
    })
  })
})
