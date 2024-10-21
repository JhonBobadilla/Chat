import express from 'express'
import logger from 'morgan'
import dotenv from 'dotenv'
import { createClient } from '@libsql/client'
import { Server } from 'socket.io'
import { createServer } from 'node:http'

dotenv.config()
const port = process.env.PORT ?? 3000
const app = express()
const server = createServer(app)
const io = new Server(server, { connectionStateRecovery: {} })
const db = createClient({
  url: 'libsql://peaceful-juniper-jhonabobadilla.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mjg5MzQxMDYsImlkIjoiNzdiZGU1MDgtNjcwYi00NmQ3LWJhM2EtYzRlYTEzNDI0ZDI0In0.R25w3wcYZ1PAwDAmLkD2D_x90lXzV896_oSzbl0-2EO52PSyhH4JsW9jm-8eMU0A2cVwAeAlVnUrJe75szZeDw'
})

await db.execute(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    user TEXT
  )
`)

io.on('connection', async (socket) => {
  console.log('a user has connected!')

  socket.on('disconnect', () => {
    console.log('an user has disconnected!')
  })

  socket.on('chat message', async (msg) => {
    let result
    const username = socket.handshake.auth.username ?? 'anonymous'
    console.log({ username })

    try {
      result = await db.execute({
        sql: 'INSERT INTO messages (content, user) VALUES (:msg, :username)',
        args: { msg, username }
      })
    } catch (e) {
      console.error(e)
      return
    }

    io.emit('chat message', msg, result.lastInsertRowid.toString(), username)
  })

  socket.on('private message', (msg, toUsername) => {
    const fromUsername = socket.handshake.auth.username ?? 'anonymous'
    const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.handshake.auth.username === toUsername)
    if (targetSocket) {
      targetSocket.emit('private message', msg, fromUsername)
    }
  })

  if (!socket.recovered) {
    try {
      const result = await db.execute({
        sql: 'SELECT id, content, user FROM messages WHERE id > ?',
        args: [socket.handshake.auth.serverOffset ?? 0]
      })

      result.rows.forEach(row => {
        socket.emit('chat message', row.content, row.id.toString(), row.user)
      })
    } catch (e) {
      console.error(e)
    }
  }
})

app.use(logger('dev'))
app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/client/index.html')
})

server.listen(port, () => {
  console.log(`Server running on port ${port}`)
})







