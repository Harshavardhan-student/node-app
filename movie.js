const express = require('express')
const path = require('path')
const app = express()

let db = null
let {open} = require('sqlite')
let sqlite3 = require('sqlite3')
const dbPath = path.join(__dirname, 'moviesData.db')

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

/*app.use(express.json())
const convertDbobjectToResponseobject = obj => {
  return {
    movieId: obj.movie_id,
    directorId: obj.director_id,
    movieName: obj.movie_name,
    leadActor: obj.lead_actor,
  }
}*/

app.get('/movies/', async (request, response) => {
  let query = `select movie_name from movie;`
  let queryOut = await db.all(query)
  response.send(queryOut)
})

app.post('/movies/', async (request, response) => {
  const requestedData = request.body
  const {directorId, movieName, leadActor} = requestedData
  let query1 = `INSERT INTO Movie (director_id,movie_name,lead_actor) VALUES (${directorId},'${movieName}','${leadActor}');`
  let queryOut1 = await db.run(query1)
  response.send('Movie Successfully Added')
})

app.get('/movies/:movieId/', async (request, response) => {
  const {movieId} = request.params
  // const parsedMovieId = parseInt(movieId)
  // console.log(movieId)
  let query2 = `SELECT movie_id,director_id,movie_name,lead_actor from movie where movie_id = ${movieId};`
  let queryOut2 = await db.get(query2)
  response.send(queryOut2)
  //response.send(convertDbobjectToResponseobject(queryOut2))
})

app.put('/movies/:movieId/', async (request, response) => {
  const {movieId} = request.params
  const requestedData = request.body
  const {directorId, movieName, leadActor} = requestedData
  const query3 = `UPDATE movie SET director_id = ${directorId},movie_name = '${movieName}',lead_actor = '${leadActor} where movie_id = ${movieId}';`
  const queryOut3 = await db.run(query3)
  response.send('Movie Details Updated')
})

app.delete('/movies/:movieId/', async (request, response) => {
  const {movieId} = request.params
  const query4 = `DELETE from movie where movie_id = ${movieId};`
  await db.run(query4)
  response.send('Movie Removed  ')
})

app.get('/directors/', async (request, response) => {
  const query5 = `SELECT director_id,director_name from director;`
  const queryOut5 = await db.all(query5)
  response.send(queryOut5)
})

app.get('/directors/:directorId/movies/', async (request, response) => {
  const {directorId} = request.params
  const query6 = `SELECT movie.movie_name from movie inner join director where director.director_id = ${directorId};`
  const queryOut6 = await db.all(query6)
  response.send(queryOut6)
})

module.exports = app.js
