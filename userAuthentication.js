const express = require('express')
const app = express()
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const dbPath = path.join(__dirname, 'userData.db')
let bcrypt = require('bcrypt')
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
      response.send('Login success!')
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  } else {
    response.status(400)
    response.send('Invalid user')
  }
})

app.put('/change-password', async (request, response) => {
  let {username, oldPassword, newPassword} = request.body
  let query = `SELECT password from user where username = '${username}';`
  let queryOut = await db.get(query)
  if (newPassword.length < 5) {
    response.status(400)
    response.send('Password is too short')
    return
  }
  let access = await bcrypt.compare(oldPassword, queryOut.password)
  if (access) {
    let newHashedPwd = await bcrypt.hash(newPassword, 10)
    let query = `UPDATE user SET password = '${newHashedPwd}' where username='${username}';`
    await db.run(query)
    response.status(200)
    response.send('Password updated')
  } else {
    response.status(400)
    response.send('Invalid current password')
  }
})

module.exports = app
