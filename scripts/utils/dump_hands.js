const utils = require('./utils')
const provenance = utils.getProvenanceJson("vordev")

const handsLeft = []
const river = ["2d", "Kc", "As", "3h", "8c"]

for(let i = 0; i < 1326; i += 1) {
  const hand = provenance.hands[i].name
  const c1 = hand.slice(0,2)
  const c2 = hand.slice(-2)
  if(!river.includes(c1) && !river.includes(c2)) {
    handsLeft.push(hand)
  }
}

console.log(handsLeft)
console.log(handsLeft.length)
