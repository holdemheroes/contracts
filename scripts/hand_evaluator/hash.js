'use strict'

const { dp } = require('./hash_tables')

/* eslint-disable camelcase */

/**
 * Calculates the quinary hash using the dp table.
 *
 * @name hash_quinary
 * @function
 * @private
 * @param {Array} q array with an element for each rank, usually total of 13
 * @param {Number} len number of ranks, usually 13
 * @param {Number} k number of cards that make up the hand, 5, 6 or 7
 * @return {Number} hash sum
 */
function hash_quinary(q, len, k) {
  var sum = 0

  for (var i = 0; i < len; i++) {
    sum += dp[q[i]][len - i - 1][k]

    k -= q[i]

    if (k <= 0) break
  }

  return sum
}

exports.hash_quinary = hash_quinary
