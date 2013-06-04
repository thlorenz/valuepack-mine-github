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

  var repos = db.sublevel(github.repos, { valueEncoding: 'json' })
    , byOwner = db.sublevel(github.byOwner, { valueEncoding: 'utf8' })

  var sub = repos
    , what = 'all'
    , argv = process.argv;

  if (~argv.indexOf('--owner')) sub = byOwner
  if (~argv.indexOf('--keys')) what = 'keys'
  if (~argv.indexOf('--values')) what = 'values'

  dump[what](sub, function(err) { cb(err, db) })
}

var storeGithubRepos = module.exports = function (db, cb) {
  var dataDir  =  path.join(__dirname, '..', 'data')
    , jsonPath =  path.join(dataDir, 'users-thlorenz-repos.json')

  if (!existsSync(jsonPath)) 
    return console.error('Cannot find %s. Please make sure to run fetch-npm-users first', jsonPath);
    
  var json = fs.readFileSync(jsonPath, 'utf8')
  
  db = sublevel(db)

  store(db, json,  function (err, subs) {
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
