#!/usr/bin/env node

'use strict';
/*jshint asi: true */

var path       =  require('path')
  , fs         =  require('fs')
  , leveldb    =  require('valuepack-core/mine/leveldb')
  , github     =  require('valuepack-core/mine/namespaces').github
  , sublevel   =  require('level-sublevel')
  , dump       =  require('level-dump')
  , store      =  require('../lib/store-github-repos')
  , existsSync =  fs.existsSync || path.existsSync


function retrieve(db, cb) {
  db = sublevel(db);

  var githubRepos =  db.sublevel(github.repos, { valueEncoding: 'json' })
    , githubUsers =  db.sublevel(github.users, { valueEncoding: 'json' })
    , usersMeta   =  db.sublevel(github.usersMeta, { valueEncoding: 'json' })
    , byOwner     =  db.sublevel(github.byOwner, { valueEncoding: 'utf8' })
    ;

  var sub = githubRepos
    , what = 'all'
    , argv = process.argv;

  if (~argv.indexOf('--owner')) sub = byOwner
  if (~argv.indexOf('--meta')) sub = usersMeta
  if (~argv.indexOf('--users')) sub = githubUsers
  if (~argv.indexOf('--keys')) what = 'keys'
  if (~argv.indexOf('--values')) what = 'values'

  dump[what](sub, function(err) { cb(err, db) })
}

var storeGithubRepos = module.exports = function (db, cb) {
  var filename =  process.argv[2];

  if (!filename) {
    console.error('To store data, please pass file name of file residing in data dir, i.e.:\n\tstore-github-repos.js issacs.json');
    console.error('To read data, please add --read flag, i.e.\n\tstore-github-repos.js --read --owner --keys');
    process.exit(1);
  }

  var dataDir  =  path.join(__dirname, '..', 'data')
    , jsonPath =  path.join(dataDir, filename)

  if (!existsSync(jsonPath)) 
    return console.error('Cannot find %s. Please make sure to run fetch-github-repos first', jsonPath);
    
  var json = fs.readFileSync(jsonPath, 'utf8')
  
  db = sublevel(db)

  store(db, JSON.parse(json), 'thlorenz', function (err, subs) {
    if (err) return cb(err, db);
    console.log('Stored all github repos at: ', leveldb.location);
    cb(null, db)
  })
}

if (module.parent) return;

if (!~process.argv.indexOf('--read'))
  leveldb.open(function (err, db) {
    if (err) return leveldb.close(err, db);
    storeGithubRepos(db, retrieve.bind(null, db, leveldb.close))
  })
else 
  leveldb.open(function (err, db) {
    if (err) return leveldb.close(err, db);
    retrieve(db, leveldb.close)
  })
