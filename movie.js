const express = require('express')
const path = require('path')
const app = express()

let db = null
let {open} = require('sqlite')
let sqlite3 = require('sqlite3')
const dbPath = path.join(__dirname, 'moviesData.db')
app.use(express.json())

let initializeAndOpenServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is running at port 3000')
    })
  } catch (e) {
    console.log(e.message())
  }
}

initializeAndOpenServer()

const convertDbobjectToResponseobject = obj => {
  return {
    movieId: obj.movie_id,
    directorId: obj.director_id,
    movieName: obj.movie_name,
    leadActor: obj.lead_actor,
  }
}

app.get('/movies/', async (request, response) => {
  const query = `select movie_name from movie;`
  const queryOut = await db.all(query)
  response.send(queryOut)
})

app.post('/movies/', async (request, response) => {
  const requestedData = request.body
  const {directorId, movieName, leadActor} = requestedData
  const query = `INSERT INTO Movie (director_id,movie_name,lead_actor) VALUES (${directorId},'${movieName}','${leadActor}');`
  const queryOut = await db.run(query)
  response.send('Movie Successfully Added')
})

app.get('/movies/:movieId/', async (request, response) => {
  const {movieId} = request.params
  // const parsedMovieId = parseInt(movieId)
  // console.log(movieId)
  const query = `SELECT movie_id,director_id,movie_name,lead_actor from movie where movie_id = ${movieId};`
  const queryOut = await db.get(query)
  response.send(convertDbobjectToResponseobject(queryOut))
})
