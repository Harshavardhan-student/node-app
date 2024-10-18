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

let convertDbObjToTweetOb = item => {
  let newArr = item.map(it => ({
    username: it.username,
    tweet: it.tweet,
    dateTime: it.dateTime,
  }))
  return newArr
}

let authenticateUser = (request, response, next) => {
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
    let access = await bcrypt.compare(password, queryOut.password)
    if (access) {
      let payload = {
        username: username,
      }
      let jwtToken = jwt.sign(payload, 'MY_TOKEN')
      response.status(200)
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

app.get('/user/tweets/feed/', authenticateUser, async (request, response) => {
  let query = `SELECT DISTINCT user.username AS username, tweet.tweet AS tweet, tweet.date_time AS dateTime
FROM user
INNER JOIN follower ON user.user_id = follower.following_user_id
INNER JOIN tweet ON tweet.user_id = follower.following_user_id
ORDER BY tweet.date_time DESC
LIMIT 4;
;`
  let queryOut = await db.all(query)
  response.send(convertDbObjToTweetOb(queryOut))
})

app.get('/user/following/', authenticateUser, async (request, response) => {
  // console.log(request.username)
  let query = `select DISTINCT user.name AS name from user inner join follower on user.user_id = follower.following_user_id WHERE follower.follower_user_id = (SELECT user_id from user where username = '${request.username}');`
  let queryOut = await db.all(query)
  response.send(queryOut)
})

app.get('/user/followers/', authenticateUser, async (request, response) => {
  let query = `SELECT DISTINCT user.name AS name from user inner join follower on user.user_id = follower.follower_user_id where follower.following_user_id = (SELECT user_id FROM user WHERE username = '${request.username}');`
  let queryOut = await db.all(query)
  response.send(queryOut)
})

app.get('/tweets/:tweetId/', authenticateUser, async (request, response) => {
  let {tweetId} = request.params
  let query = `SELECT 
    tweet.tweet AS tweet, 
    COUNT(like.like_id) AS likes, 
    COUNT(reply.reply_id) AS replies, 
    tweet.date_time AS dateTime 
FROM tweet 
INNER JOIN follower ON tweet.user_id = follower.following_user_id 
LEFT JOIN like ON tweet.tweet_id = like.tweet_id
LEFT JOIN reply ON tweet.tweet_id = reply.tweet_id
WHERE follower.follower_user_id = (SELECT user_id FROM user WHERE username = '${request.username}')
  AND tweet.tweet_id = ${tweetId}
ORDER BY tweet.date_time DESC;
`
  let queryOut = await db.get(query)
  if (queryOut.tweet !== null) {
    response.send(queryOut)
  } else {
    response.status(401)
    response.send('Invalid Request')
  }
})

module.exports = app
