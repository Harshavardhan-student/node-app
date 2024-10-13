const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'cricketTeam.db')
let db = null

const initializeAndOpenServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () => {
      console.log('Server is running at http://localhost:3000/players/')
    })
  } catch (e) {
    console.log(`DBerror: ${e.message}`)
    process.exit(1)
  }
}

initializeAndOpenServer()

const convertDbObjectToResponseObject = dbObject => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
    jerseyNumber: dbObject.jersey_number,
    role: dbObject.role,
  }
}

app.get('/players/', async (request, response) => {
  const query = `
 SELECT * from cricket_team order by player_id;
 
 `
  const queryOut = await db.all(query)
  response.send(
    queryOut.map(eachPlayer => convertDbObjectToResponseObject(eachPlayer)),
  )
})

app.post('/players/', async (request, response) => {
  let requestedData = request.body
  let {playerName, jerseyNumber, role} = requestedData
  const query = `INSERT INTO cricket_team (player_name,jersey_number,role) VALUES ('${playerName}' , ${jerseyNumber},'${role}')`
  const dbResponse = await db.run(query)
  response.send('Player Added to Team')
})

app.get('/players/:playerId/', async (request, response) => {
  let {playerId} = request.params
  let requestedData = request.body
  const query = `SELECT * FROM CRICKET_TEAM WHERE player_id = ${playerId}`
  const dbResponse = await db.get(query)
  response.send(convertDbObjectToResponseObject(dbResponse))
})

app.put('/players/:playerId/', async (request, response) => {
  let {playerId} = request.params
  let requestedData = request.body
  let {playerName, jerseyNumber, role} = requestedData
  //console.log({playerName, jerseyNumber, role})
  const query = `UPDATE cricket_team SET player_name = '${playerName}',jersey_number = ${jerseyNumber},role='${role}' WHERE player_id = ${playerId};`
  const dbResponse = await db.run(query)
  response.send('Player Details Updated')
})

app.delete('/players/:playerId/', async (request, response) => {
  let {playerId} = request.params
  const query = `DELETE FROM CRICKET_TEAM WHERE player_id = ${playerId};`
  const dbResponse = await db.run(query)
  response.send('Player Removed')
})

module.exports = app
