const express = require('express')
const app = express()
const path = require('path')
let db = null
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

app.use(express.json())

const dbPath = path.join(__dirname, 'covid19India.db')

const initializeAndOpenServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is running at port 3000')
    })
  } catch (e) {
    console.log(`DB error ${e.message}`)
    process.exit(1)
  }
}

initializeAndOpenServer()

let convertDbObjToSqlObject = ob => {
  let newArr = ob.map(item => ({
    stateId: item.state_id,
    stateName: item.state_name,
    population: item.population,
  }))
  return newArr
}

/*let convertDbObjToDistrictObject = ob => {
  let newArr = ob.map(item => ({
    district_name
    ,state_id,
    cases,
    cured,
    active,
    deaths,
  }))
  return newArr
}*/

app.get('/states/', async (request, response) => {
  const query = `SELECT state_id,state_name,population from state;`
  const queryOut = await db.all(query)
  response.send(convertDbObjToSqlObject(queryOut))
})

app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params
  const query = `SELECT state_id,state_name,population from state where state_id=${stateId};`
  const queryOut = await db.get(query)
  response.send({
    stateId: queryOut.state_id,
    stateName: queryOut.state_name,
    population: queryOut.population,
  })
})

app.post('/districts/', async (request, response) => {
  let {districtName, stateId, cases, cured, active, deaths} = request.body
  const query = `INSERT INTO district  (district_name,state_id,cases,cured,active,deaths) VALUES ('${districtName}',
  ${stateId},
  ${cases},
  ${cured},
  ${active},
  ${deaths});`
  await db.run(query)
  response.send('District Successfully Added')
})

app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const query = `SELECT district_id,district_name,state_id,cases,cured,active,deaths from district where district_id=${districtId};`
  const queryOut = await db.get(query)
  response.send({
    districtId: queryOut.district_id,
    districtName: queryOut.district_name,
    stateId: queryOut.state_id,
    cases: queryOut.cases,
    cured: queryOut.cured,
    active: queryOut.active,
    deaths: queryOut.deaths,
  })
})

app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const query = `DELETE from district where district_id=${districtId};`
  await db.run(query)
  response.send('District Removed')
})

app.put('/districts/:districtId/', async (request, response) => {
  let {districtId} = request.params
  let {districtName, stateId, cases, cured, active, deaths} = request.body
  const query = `UPDATE district SET district_name='${districtName}',
  state_id = ${stateId},
  cases = ${cases},
  cured = ${cured},
  active = ${active},
  deaths = ${deaths}; where district_id = ${districtId}`
  await db.run(query)
  response.send('District Details Updated')
})

app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const query = `SELECT sum(district.cases) AS totalCases,sum(district.cured) AS totalCured,sum(district.active) AS totalActive,sum(district.deaths) AS totalDeaths from district inner join state on state.state_id = district.state_id where district.state_id=${stateId};`
  const queryOut = await db.get(query)
  response.send({
    totalCases: queryOut.totalCases,
    totalCured: queryOut.totalCured,
    totalActive: queryOut.totalActive,
    totalDeaths: queryOut.totalDeaths,
  })
})

app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  const query = `SELECT state.state_name AS stateName from state inner join district on state.state_id = district.state_id where district.district_id=${districtId};`
  const queryOut = await db.get(query)
  response.send({
    stateName: queryOut.stateName,
  })
})

module.exports = app
