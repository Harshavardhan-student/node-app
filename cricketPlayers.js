const express = require('express')
const app = express()
let db = null
const {open} = require('sqlite')

const sqlite3 = require('sqlite3')
const path = require('path')
const dbpath = path.join(__dirname, 'cricketMatchDetails.db')

app.use(express.json())

const initializaAndOpenServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is running at http://localhost:3000')
    })
  } catch (d) {
    console.log(d.message)
  }
}

initializaAndOpenServer()

let convertDbObjectToPlayerObject = obj => {
  let newArr = obj.map(it => ({
    playerId: it.player_id,
    playerName: it.player_name,
  }))
  return newArr
}

let convertDbObjectToMatchObject = obj => {
  let newArr = obj.map(it => ({
    matchId: it.match_id,
    match: it.match,
    year: it.year,
  }))
  return newArr
}

let convertDbObjectToPlayersObject = obj => {
  let newArr = obj.map(it => ({
    playerId: it.player_id,
    playerName: it.player_name,
  }))
  return newArr
}

app.get('/players/', async (request, response) => {
  const query = `select player_id,player_name from player_details;`
  const queryOut = await db.all(query)
  response.send(convertDbObjectToPlayerObject(queryOut))
})

app.get('/players/:playerId/', async (request, response) => {
  let {playerId} = request.params
  const query = `select player_id,player_name from player_details where player_id=${playerId};`
  const queryOut = await db.get(query)
  response.send({
    playerId: queryOut.player_id,
    playerName: queryOut.player_name,
  })
})

app.put('/players/:playerId/', async (request, response) => {
  let {playerId} = request.params
  let {playerName} = request.body
  const query = `UPDATE player_details SET player_name = '${playerName}' where player_id = ${playerId};`
  const queryOut = await db.run(query)
  response.send('Player Details Updated')
})

app.get('/matches/:matchId/', async (request, response) => {
  let {matchId} = request.params
  const query = `select match_id,match,year from match_details where match_id=${matchId};`
  const queryOut = await db.get(query)
  response.send({
    matchId: queryOut.match_id,
    match: queryOut.match,
    year: queryOut.year,
  })
})

app.get('/players/:playerId/matches', async (request, response) => {
  let {playerId} = request.params
  const query = `select match_details.match_id,match_details.match,match_details.year from match_details inner join player_match_score on match_details.match_id=player_match_score.match_id where player_match_score.player_id=${playerId};`
  const queryOut = await db.all(query)
  response.send(convertDbObjectToMatchObject(queryOut))
})

app.get('/matches/:matchId/players', async (request, response) => {
  let {matchId} = request.params
  const query = `select player_details.player_id,player_details.player_name from player_details inner join player_match_score on player_details.player_id = player_match_score.player_id where player_match_score.match_id=${matchId};`
  const queryOut = await db.all(query)
  response.send(convertDbObjectToPlayersObject(queryOut))
})

app.get('/players/:playerId/playerScores', async (request, response) => {
  let {playerId} = request.params
  const query = `select player_details.player_id,player_details.player_name,sum(player_match_score.score) AS score,sum(player_match_score.fours) AS fours,sum(player_match_score.sixes) AS sixes from player_details inner join player_match_score on player_details.player_id = player_match_score.player_id where player_match_score.player_id=${playerId};`
  const queryOut = await db.get(query)
  response.send({
    playerId: queryOut.player_id,
    playerName: queryOut.player_name,
    totalScore: queryOut.score,
    totalFours: queryOut.fours,
    totalSixes: queryOut.sixes,
  })
})
module.exports = app
