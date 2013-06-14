'use strict';
/*jshint asi: true */

var test = require('tap').test
  , fs = require('fs')
  , store = require('../lib/store-github-repos')
  , levelup = require('levelup')

// file contains the following data:
//  user with 5 followers, dwcook, tomplays, jasonkostempski, jeffchuber, daaku
//  3 repos(1 php, 2 javascript) 
var json = fs.readFileSync(__dirname + '/fixtures/repos-isaacs.json', 'utf8')

