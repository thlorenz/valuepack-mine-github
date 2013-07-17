'use strict';
/*jshint asi: true */

var test = require('tap').test
  , calc = require('../lib/calc-wait')

var hour = 60 * 60 * 1000;
var min = 1000 * 60;

test('\nneed to wait for an hour and waited for 30 mins', function (t) {
  var d1 = Date.now();
  var d2 = Date.now();
  d2 -= min * 30;

  var wait = calc(d2, hour) / min;

  t.ok(29 <= wait && wait <= 30, 'need to wait for 30 mins more');
  t.end()
})

test('\nneed to wait for an hour and waited for 50 mins', function (t) {
  var d1 = Date.now();
  var d2 = Date.now();
  d2 -= min * 50;

  var wait = calc(d2, hour) / min;

  t.ok(9 <= wait && wait <=  10, 'need to wait for 10 mins more');
  t.end()
})

test('\nneed to wait for an hour and waited for 70 mins', function (t) {
  var d1 = Date.now();
  var d2 = Date.now();
  d2 -= min * 70;

  var wait = calc(d2, hour) / min;

  t.equal(calc(d2, hour), 0, 'need to wait for 0 ms more');
  t.end()
})
