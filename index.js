const http = require('http');

const express = require('express');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);


app.use(express.static('public'));

server.listen(3000, () => {
    console.log('server on port 3000')
});











/*código hasta 20:39 sin problema

const http = require('http');

const express = require('express');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);


app.use(express.static('public'));

server.listen(3000, () => {
    console.log('server on port 3000')
});

*/