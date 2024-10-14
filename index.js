const http = require('htpp');

const express = require('express');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);


app.use(express.static('public'));

server.listen(3000, () => {
    console.log('server on port 3000')
});
