const express = require('express')
const app = express()
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const path = require('path')
const dbPath = path.join(__dirname, 'twitterClone.db')
app.use(express.json())
let db = null

let openServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is running at port 3000')
    })
  } catch (e) {
    console.log('${e.message}')
  }
}

openServer()

let authenticateUser = () => {
  let authHeader = request.headers['authorization']
  let jwtToken = authHeader.split(' ')[1]
  if (authHeader === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
    return
  }
  if (jwtToken !== undefined) {
    jwt.verify(jwtToken, 'MY_TOKEN', (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        request.username = payload.username
        next()
      }
    })
  } else {
    response.status(401)
    response.send('Invalid JWT Token')
  }
}

app.post('/register/', async (request, response) => {
  let {username, password, name, gender} = request.body
  let query = `SELECT * from user where username = '${username}';`
  let queryOut = await db.get(query)
  if (queryOut === undefined) {
    if (password.length < 6) {
      response.status(400)
      response.send('Password is too short')
      return
    }
    const hashedPwd = await bcrypt.hash(password, 10)
    query = `INSERT into user (name,username,password,gender) VALUES ('${name}','${username}','${hashedPwd}','${gender}');`
    await db.run(query)
    response.status(200)
    response.send('User created successfully')
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

app.post('/login/', async (request, response) => {
  let {username, password} = request.body
  let query = `SELECT * from user where username = '${username}';`
  let queryOut = await db.get(query)
  if (queryOut !== undefined) {
    let access = bcrypt.compare(password, queryOut.password)
    if (access) {
      let payload = {
        username: username,
      }
      let jwtToken = jwt.sign(payload, 'MY_TOKEN')
      response.status(200)
      response.send(jwtToken)
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})
