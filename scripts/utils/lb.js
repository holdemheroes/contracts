
const leaderboard = []
const maxSlots = 10

for(let i = 0; i < maxSlots; i += 1) {
  const entry = {
    rank: 0,
    player: "0x0",
  }
  leaderboard.push(entry)
}

function addRank(player, rank) {
  if (leaderboard[maxSlots-1].rank <= rank && leaderboard[maxSlots-1].rank > 0) {
    return false
  }

  for (let i = 0; i < maxSlots; i += 1) {
    if (leaderboard[i].rank > rank || leaderboard[i].rank === 0) {
      // console.log(rank, ">", leaderboard[i].rank, "at", i)
      if(leaderboard[i].rank === 0) {
        // console.log("0x0 - insert and return")
        leaderboard[i].player = player
        leaderboard[i].rank = rank
        return true
      }
      // console.log("need to shift down from", i)
      for(let j = maxSlots - 1; j >= i; j -= 1) {
        if(leaderboard[j].rank !== 0) {
          if(j+1 < maxSlots) {
            // console.log( "shift", j, "down to", j + 1 )
            leaderboard[j + 1] = leaderboard[j]
          }
        }
      }
      // console.log("insert at", i)
      leaderboard[i] = {
        rank, player
      }
      return true
    }
  }
}

addRank("0x1", 24)
addRank("0x2", 99)
addRank("0x3", 101)
addRank("0x4", 25)
addRank("0x5", 2)
addRank("0x6", 100)
addRank("0x7", 103)
addRank("0x8", 119)
addRank("0x9", 24)
addRank("0x10", 48)
addRank("0x11", 3)

console.log(leaderboard)
