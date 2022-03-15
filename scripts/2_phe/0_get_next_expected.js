require("dotenv").config()
const PokerHandEvaluator = artifacts.require("PokerHandEvaluator")

module.exports = async function(callback) {

  try {
    const phe = await PokerHandEvaluator.deployed()

    const suitsSet = await phe.suitsSet()
    console.log( "suitsSet", suitsSet )

    const flushSet = await phe.flushSet()
    if ( flushSet ) {
      console.log( "flushSet", flushSet )
    } else {
      const nextFlush = ( await phe.nextExpectedFlushBatchId() ).toNumber()
      console.log( `next expected batch Id for Flush = ${nextFlush}` )
    }

    const noFlushSet = await phe.noFlushSet()
    if ( noFlushSet ) {
      console.log( "noFlushSet", noFlushSet )
    } else {
      const nextNoFlush = ( await phe.nextExpectedNoFlushBatchId() ).toNumber()
      console.log( `next expected batch Id for NoFlush = ${nextNoFlush}` )
    }

    const dpSet = await phe.dpSet()
    if ( dpSet ) {
      console.log( "dpSet", dpSet )
    } else {
      const nextDp = ( await phe.nextExpectedDpBatchId() ).toNumber()
      console.log( `next expected batch Id for Dp = ${nextDp}` )
    }
  } catch(e) {
    console.log(e)
    callback()
  }

  callback()
}
