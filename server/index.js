import express from 'express';
import logger from 'morgan';
import dotenv from 'dotenv';
import pkg from 'pg';
import { Server } from 'socket.io';
import { createServer } from 'node:http';

dotenv.config();
const { Client } = pkg;
const port = process.env.PORT ?? 3003;
const app = express();
const server = createServer(app);
const io = new Server(server, { connectionStateRecovery: {} });

// ---- CONEXIÓN A POSTGRES LOCAL ----
const db = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'w858504042828',
  database: 'chat',
});

// ---- CONEXIÓN ----
await db.connect();

// ---- SOCKET.IO ----
io.on('connection', async (socket) => {
  console.log('a user has connected!');

  socket.on('disconnect', () => {
    console.log('a user has disconnected!');
  });

  // --- ENVÍO DE MENSAJE AL CHAT ---
  socket.on('chat message', async (msg, chatId = 1) => {
    let result;
    const username = socket.handshake.auth.username ?? 'anonymous';
    console.log({ username, chatId, msg });

    try {
      result = await db.query({
        text: 'INSERT INTO messages (content, username, chat_id) VALUES ($1, $2, $3) RETURNING id',
        values: [msg, username, chatId]
      });

      if (result.rows.length > 0) {
        io.emit('chat message', msg, result.rows[0].id.toString(), username, chatId);
      } else {
        console.error('No rows returned from the database.');
      }
    } catch (e) {
      console.error(e);
    }
  });

  // --- MENSAJE PRIVADO ENTRE USUARIOS ---
  socket.on('private message', (msg, toUsername) => {
    const fromUsername = socket.handshake.auth.username ?? 'anonymous';
    const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.handshake.auth.username === toUsername);
    if (targetSocket) {
      targetSocket.emit('private message', msg, fromUsername);
    }
  });

  // --- RECUPERAR MENSAJES (por chat) ---
  if (!socket.recovered) {
    try {
      const chatId = 1; // Puedes cambiar esto para otros chats
      const result = await db.query({
        text: 'SELECT id, content, username, chat_id FROM messages WHERE id > $1 AND chat_id = $2',
        values: [socket.handshake.auth.serverOffset ?? 0, chatId]
      });

      result.rows.forEach(row => {
        socket.emit('chat message', row.content, row.id.toString(), row.username, row.chat_id);
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
