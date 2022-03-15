require("dotenv").config()
const HoldemHeroes = artifacts.require("HoldemHeroes")

module.exports = async function(callback) {
  const holdemHeroes = await HoldemHeroes.deployed()

  for(let i = 0; i < 1326; i += 1) {
    try {
      const owner = await holdemHeroes.ownerOf(i)
      console.log(i, "owned by", owner)
    } catch (e) {
      console.log(i, "no owner")
    }
  }

  callback()
}
