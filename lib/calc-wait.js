'use strict';

/**
 * Calucalates how many ms we still have to wait given we already waited until now.
 *
 * @name exports
 * @function
 * @param started {Number} date represented in ms when we started to wait (i.e. obtained earlier via Date.now())
 * @param totalwait {Number} total ms we have to wait
 * @return {Number} how many ms we yet have to wait
 */
var go = module.exports = function (started, totalwait) {
  var now    =  Date.now()
    , waited =  now - started
    , diff   =  totalwait - waited

  return Math.max(diff, 0);
};
