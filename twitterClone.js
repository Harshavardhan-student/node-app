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
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  } else {
    response.status(401)
    response.send('Invalid JWT Token')
    return
  }

  jwt.verify(jwtToken, 'mySecretCode', (error, payload) => {
    if (error) {
      response.status(401)
      response.send('Invalid JWT Token')
    } else {
      request.username = payload.username
      next()
    }
  })
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
      let jwtToken = jwt.sign(payload, 'mySecretCode')
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
WHERE follower.follower_user_id = (SELECT user_id FROM user WHERE username = '${request.username}')
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
GROUP BY tweet.tweet;
`
  let queryOut = await db.get(query)
  /* response.send(queryOut)
  if (queryOut) {
    console.log('hi')
  }*/
  if (queryOut) {
    response.send({
      tweet: queryOut.tweet,
      likes: queryOut.likes,
      replies: queryOut.replies,
      dateTime: queryOut.dateTime,
    })
  } else {
    response.status(401)
    response.send('Invalid Request')
  }
})

app.get(
  '/tweets/:tweetId/likes/',
  authenticateUser,
  async (request, response) => {
    let array = []
    let {tweetId} = request.params
    let query = `SELECT user.username AS name from user inner join like on user.user_id = like.user_id inner join tweet on like.tweet_id = tweet.tweet_id inner join follower on tweet.user_id = follower.following_user_id where follower.follower_user_id =(SELECT user_id FROM user where username = '${request.username}')
 AND tweet.tweet_id = ${tweetId};`
    let queryOut = await db.all(query)
    for (let i of queryOut) {
      array.push(i.name)
    }
    if (array.length !== 0) {
      response.send({
        likes: array,
      })
    } else {
      response.status(401)
      response.send('Invalid Request')
    }
  },
)

app.get(
  '/tweets/:tweetId/replies/',
  authenticateUser,
  async (request, response) => {
    let {tweetId} = request.params
    let query = `SELECT 
  user.name AS name,
  reply.reply AS reply
FROM reply
INNER JOIN user ON user.user_id = reply.user_id 
INNER JOIN tweet ON reply.tweet_id = tweet.tweet_id
INNER JOIN follower ON follower.following_user_id = tweet.user_id
WHERE follower.follower_user_id = (SELECT user_id FROM user WHERE username = '${request.username}')
  AND tweet.tweet_id = ${tweetId};
`
    let queryOut = await db.all(query)
    if (queryOut.length > 0) {
      response.send({
        replies: queryOut,
      })
    } else {
      response.status(401)
      response.send('Invalid Request')
    }
  },
)

app.get('/user/tweets/', authenticateUser, async (request, response) => {
  let query = `
SELECT tweet.tweet AS tweet,COUNT(DISTINCT like.like_id) AS likes,COUNT(DISTINCT reply.reply_id) AS replies,tweet.date_time AS dataTime from tweet LEFT join like on tweet.tweet_id = like.tweet_id LEFT join reply on reply.tweet_id = tweet.tweet_id 
where tweet.user_id = (SELECT user_id from user where username = '${request.username}')
GROUP BY tweet.tweet, tweet.date_time;
`
  let queryOut = await db.all(query)
  let returnArr = queryOut.map(it => ({
    tweet: it.tweet,
    likes: it.likes,
    replies: it.replies,
    dateTime: it.dateTime,
  }))
  response.send(returnArr)
})

app.post('/user/tweets/', authenticateUser, async (request, response) => {
  let {tweet} = request.body
  let query = `INSERT INTO tweet (tweet) VALUES ('${tweet}');`
  await db.run(query)
  response.send('Created a Tweet')
})

app.delete('/tweets/:tweetId/', authenticateUser, async (request, response) => {
  let {tweetId} = request.params
  let query = `DELETE FROM tweet where tweet_id = ${tweetId} AND user_id = (SELECT user_id from user where username = '${request.username}');`
  let queryOut = await db.run(query)
  if (queryOut.changes > 0) {
    response.send('Tweet Removed')
  } else {
    response.status(401)
    response.send('Invalid Request')
  }
})

module.exports = app
