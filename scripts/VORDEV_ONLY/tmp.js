const { BN } = require( "@openzeppelin/test-helpers" )
const expectedTotalPaidIn    = new BN("10000000000000000000") // 10 eth
// const expectedHouseCut       = new BN("2500000000000000000")  // 2.5% of 10000000000000000000
// const expectedWinnerAmount   = new BN("468000000000000000") // 60% of 10000000000000000000
// const expectedRunnerUpAmount = new BN("62400000000000000") // 40% of 780000000000000000 / 5


const expectedHouseCut = expectedTotalPaidIn.div(new BN(1000)).mul(new BN(25))
const claimPot = expectedTotalPaidIn.sub(expectedHouseCut)
const expectedWinnerAmount = claimPot.div(new BN(100)).mul(new BN(60))
let runnerUpClaimPot = claimPot.sub(expectedWinnerAmount)
const expectedRunnerUpAmount = runnerUpClaimPot.div(new BN(9))

console.log("expectedHouseCut", expectedHouseCut.toString())
console.log("claimPot", claimPot.toString())
console.log("expectedWinnerAmount", expectedWinnerAmount.toString())
console.log("expectedRunnerUpAmount", expectedRunnerUpAmount.toString())

for(let i = 0; i < 9; i += 1 ) {
  runnerUpClaimPot = runnerUpClaimPot.sub(expectedRunnerUpAmount)
}

console.log("remaining runnerUpClaimPot", runnerUpClaimPot.toString())
