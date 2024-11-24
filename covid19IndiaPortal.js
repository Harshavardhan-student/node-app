const express = require('express')
const app = express()
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const dbPath = path.join(__dirname, 'covid19IndiaPortal.db')
let bcrypt = require('bcrypt')
let jwt = require('jsonwebtoken')
let db = null

app.use(express.json())

const initializeAndOpenServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('server is running at port 3000')
    })
  } catch (e) {
    console.log(e.message)
  }
}

initializeAndOpenServer()

let convertDbObjectToStateObject = queryOut => {
  let resultArr = queryOut.map(it => ({
    stateId: it.state_id,
    stateName: it.state_name,
    population: it.population,
  }))
  return resultArr
}

const authenticateUser = (request, response, next) => {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  } else {
    response.status(401)
    response.send('Invalid JWT Token')
    return
  }
  jwt.verify(jwtToken, 'MY_SECRET_TOKEN', async (error, payload) => {
    if (error) {
      response.status(401)
      response.send('Invalid JWT Token')
    } else {
      request.username = payload.password
      // response.send('Login success')
      next()
    }
  })
}

app.post('/register', async (request, response) => {
  let {username, name, password, gender, location} = request.body
  let query = `select * from user where username = '${username}'`
  let queryOut = await db.get(query)
  if (queryOut === undefined) {
    if (password.length < 5) {
      response.status(400)
      response.send('Password is too short')
      return
    }
    const hashedPwd = await bcrypt.hash(password, 10)
    // console.log(hashedPwd)
    let query = `INSERT INTO user (username,name,password,gender,location) VALUES('${username}','${name}','${hashedPwd}','${gender}','${location}');`
    await db.run(query)
    response.status(200)
    response.send('User created successfully')
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

app.post('/login', async (request, response) => {
  let {username, password} = request.body
  let query = `select * from user where username = '${username}';`
  let queryOut = await db.get(query)
  if (queryOut !== undefined) {
    const access = await bcrypt.compare(password, queryOut.password)
    if (access) {
      response.status(200)
      // response.send('Login success!')
      let payload = {
        username: username,
      }
      const jwtToken = jwt.sign(payload, 'MY_SECRET_TOKEN')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  } else {
    response.status(400)
    response.send('Invalid user')
  }
})

app.get('/users', authenticateUser, async (request, response) => {
  let {username} = request
  let query = `SELECT * from user where username = '${username}';`
  const queryOut = await db.get(query)
  response.send(queryOut)
})

app.get('/states/', authenticateUser, async (request, response) => {
  let query = `SELECT state_id,state_name,population from state;`
  let queryOut = await db.all(query)
  response.send(convertDbObjectToStateObject(queryOut))
})

app.get('/states/:stateId/', authenticateUser, async (request, response) => {
  let {stateId} = request.params
  let query = `SELECT state_id,state_name,population from state where state_id=${stateId};`
  let queryOut = await db.get(query)
  response.send({
    stateId: queryOut.state_id,
    stateName: queryOut.state_name,
    population: queryOut.population,
  })
})

app.post('/districts/', authenticateUser, async (request, response) => {
  let {districtName, stateId, cases, cured, active, deaths} = request.body
  let query = `INSERT INTO district (district_name,state_id,cases,cured,active,deaths) VALUES ('${districtName}',
  ${stateId},${cases},${cured},${active},${deaths});`

  let queryOut = await db.run(query)
  response.send('District Successfully Added')
})

app.get(
  '/districts/:districtId/',
  authenticateUser,
  async (request, response) => {
    let {districtId} = request.params
    let query = `SELECT * from district where district_id=${districtId};`
    let queryOut = await db.get(query)
    response.send({
      districtId: queryOut.district_id,
      districtName: queryOut.district_name,
      stateId: queryOut.state_id,
      cases: queryOut.cases,
      cured: queryOut.cured,
      active: queryOut.active,
      deaths: queryOut.deaths,
    })
  },
)

app.delete(
  '/districts/:districtId/',
  authenticateUser,
  async (request, response) => {
    let {districtId} = request.params
    let query = `DELETE from district where district_id=${districtId};`
    await db.run(query)
    response.send('District Removed')
  },
)

app.put(
  '/districts/:districtId/',
  authenticateUser,
  async (request, response) => {
    let {districtId} = request.params
    let {districtName, stateId, cases, cured, active, deaths} = request.body
    let query = `UPDATE district SET district_name='${districtName}',state_id=${stateId},cases=${cases},cured=${cured},active=${active},deaths=${deaths} where district_id = ${districtId};`
    let queryOut = await db.run(query)
    response.send('District Details Updated')
  },
)

app.get(
  '/states/:stateId/stats/',
  authenticateUser,
  async (request, response) => {
    let {stateId} = request.params
    let query = `SELECT total(cases) AS totalCases,total(cured) AS totalCured,total(active) AS totalActive,total(deaths) AS totalDeaths from district where state_id=${stateId};`
    let queryOut = await db.get(query)
    response.send(queryOut)
  },
)

module.exports = app
