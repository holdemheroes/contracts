const fs = require('fs')
const path = require("path")

const artifactsToGenerate = [
  'HoldemHeroes',
  'HoldemHeroesL2',
  'IHoldemHeroes',
  'TexasHoldemV1',
  'PokerHandEvaluator',
  'IPokerHandEvaluator'
]

artifactsToGenerate.forEach(async function(a) {
  const source = path.resolve(__dirname, `../../build/contracts/${a}.json`)
  const destDir = path.resolve(__dirname, `../../data/abis`)
  await fs.promises.mkdir(destDir, { recursive: true })
  const dest = path.resolve(`${destDir}/${a}.json`)
  const artifact = JSON.parse(fs.readFileSync(source))
  fs.writeFileSync(dest, JSON.stringify(artifact.abi) + '\n')
})
