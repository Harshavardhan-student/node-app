const express = require('express')
const app = express()
const {open} = require('sqlite')
const path = require('path')
const sqlite3 = require('sqlite3')
const dbpath = path.join(__dirname, 'todoApplication.db')
let db = null
app.use(express.json())

let initializeAndOpenServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is running at http://localhost:3000')
    })
  } catch (e) {
    console.log(e.message)
  }
}

initializeAndOpenServer()

let convertDbObjectTotodoObject = obj => {
  let newArr = obj.map(it => ({
    id: it.id,
    todo: it.todo,
    priority: it.priority,
    status: it.status,
  }))
  return newArr
}

app.get('/todos/', async (request, response) => {
  let {status} = request.query
  let query = `SELECT id,todo,priority,status FROM todo where status = '${status}';`
  let queryOut = await db.all(query)
  response.send(convertDbObjectTotodoObject(queryOut))
})
