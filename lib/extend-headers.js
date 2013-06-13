'use strict';

var xtend = require('xtend');

module.exports = function (hdrs) {
  return xtend(hdrs, { 'user-agent': 'valuepack' });
};
