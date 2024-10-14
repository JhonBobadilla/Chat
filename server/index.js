import express from 'express'
import logger from 'morgan'
import dotenv from 'dotenv'
import { createClient } from '@libsql/client'

import { Server } from 'socket.io'
import { createServer } from 'node:http'

const port = process.env.PORT ?? 3000

const app = express()
const server = createServer(app)
const io = new Server(server, {connectionStateRecovery: {}
})

const db = createClient({

url:'libsql://peaceful-juniper-jhonabobadilla.turso.io',
authToken:'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mjg5MzQxMDYsImlkIjoiNzdiZGU1MDgtNjcwYi00NmQ3LWJhM2EtYzRlYTEzNDI0ZDI0In0.R25w3wcYZ1PAwDAmLkD2D_x90lXzV896_oSzbl0-2EO52PSyhH4JsW9jm-8eMU0A2cVwAeAlVnUrJe75szZeDw'
})

await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT
    )
    `)



io.on('connection', (socket) => {
    console.log('an user has connected!')

    socket.on('disconnect', () => {
    console.log('an user has disconnected!')  
    })

    socket.on('chat message', async (msg) => {
        let result
        try {
          result = await db.execute({
           sql: `INSERT INTO messages (content) VALUES (:message)`,
           args: { message: msg }  
          })
        }catch (e){

        }
        io.emit('chat message', msg) 
    })
})

app.use(logger('dev'))

app.get('/', (req, res) => {
res.sendFile(process.cwd() + '/client/index.html')
})

server.listen(port, () => {
    console.log(`Server running on port ${port}`)
})



