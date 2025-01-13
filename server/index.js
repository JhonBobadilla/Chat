import express from 'express';
import logger from 'morgan';
import dotenv from 'dotenv';
import pkg from 'pg';
import { Server } from 'socket.io';
import { createServer } from 'node:http';

dotenv.config();
const { Client } = pkg;
const port = process.env.PORT ?? 3000;
const app = express();
const server = createServer(app);
const io = new Server(server, { connectionStateRecovery: {} });

const db = new Client({
  host: 'c3nv2ev86aje4j.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com',
  port: 5432,
  user: 'u7lk2rav6e1ko2',
  password: 'p3f4ed7a54b68554467acefe46529129a11c92ea34105c5d161c62916dc3422aa',
  database: 'd29avlllbhcs77',
  ssl: { rejectUnauthorized: false }
});

await db.connect();

await db.query(`
  CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    content TEXT,
    username VARCHAR(255)
  )
`);

io.on('connection', async (socket) => {
  console.log('a user has connected!');

  socket.on('disconnect', () => {
    console.log('a user has disconnected!');
  });

  socket.on('chat message', async (msg) => {
    let result;
    const username = socket.handshake.auth.username ?? 'anonymous';
    console.log({ username });

    try {
      result = await db.query({
        text: 'INSERT INTO messages (content, username) VALUES ($1, $2) RETURNING id',
        values: [msg, username]
      });

      if (result.rows.length > 0) {
        io.emit('chat message', msg, result.rows[0].id.toString(), username);
      } else {
        console.error('No rows returned from the database.');
      }
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('private message', (msg, toUsername) => {
    const fromUsername = socket.handshake.auth.username ?? 'anonymous';
    const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.handshake.auth.username === toUsername);
    if (targetSocket) {
      targetSocket.emit('private message', msg, fromUsername);
    }
  });

  if (!socket.recovered) {
    try {
      const result = await db.query({
        text: 'SELECT id, content, username FROM messages WHERE id > $1',
        values: [socket.handshake.auth.serverOffset ?? 0]
      });

      result.rows.forEach(row => {
        socket.emit('chat message', row.content, row.id.toString(), row.username);
      });
    } catch (e) {
      console.error(e);
    }
  }
});

app.use(logger('dev'));
app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/client/index.html');
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});











