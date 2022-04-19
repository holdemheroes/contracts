const flatten = require('truffle-flattener')
const fs = require('fs')

const contractsToFlatten = [
  "HoldemHeroes.sol",
  "HoldemHeroesL2.sol",
  "PlayingCards.sol",
  "TexasHoldemV1.sol"
]

contractsToFlatten.forEach(async (c) => {
  const source = `./contracts/${c}`
  const dest = `./flat/${c}`
  const flat = await flatten([source])
  fs.writeFileSync(dest, flat)
})
