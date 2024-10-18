import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const rooms = {};

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log('New client connected');

  // Fonctionality to store the player ids connected on the website
  socket.on('storePlayerId', (playerId) => {
    socket.playerId = playerId;
  });

  // Functionality to get all players ids connected on the website
  socket.on('getPlayersIds', () => {
    const playersIds = [];
    io.sockets.sockets.forEach((s) => {
      playersIds.push(s.playerId || null);
    });
    socket.emit('playersIds', playersIds);
  });

  // get the player id
  socket.on('getPlayerId', () => {
    io.emit('playerId', socket.playerId);
  });

  socket.on('createRoom', ({ roomName, playerId }) => {
    if (!rooms[roomName]) {
      rooms[roomName] = { players: [], gameStarted: false };
      io.emit('roomsList', Object.keys(rooms));
    }
    socket.join(roomName);
    rooms[roomName].players.push({ id: playerId, role: 'Drawer', socketId: socket.id });
    io.to(roomName).emit('roomData', rooms[roomName].players);
    socket.emit('updateRole', 'Drawer');
  });

  socket.on('joinRoom', ({ roomName, playerId }) => {
    if (rooms[roomName] && rooms[roomName].players.length < 5 && !rooms[roomName].gameStarted) {
      socket.join(roomName);
      rooms[roomName].players.push({ id: playerId, role: 'Guesser', socketId: socket.id });
      io.to(roomName).emit('roomData', rooms[roomName].players);
      socket.emit('updateRole', 'Guesser');
    } else {
      socket.emit('roomFull');
    }
  });

  socket.on('getRoomData', (roomName) => {
    socket.emit('roomData', rooms[roomName]);
  });

  socket.on('startGame', (roomName) => {
    if (rooms[roomName]) {
      rooms[roomName].gameStarted = true;
      io.to(roomName).emit('startGame', rooms[roomName].players);
    }
  });

  socket.on('joinGame', ({ roomName, playerId }) => {
    const room = rooms[roomName]?.players;
    if (room) {
      const player = room.find(p => p.id === playerId);
      if (player) {
        socket.emit('playerData', { role: player.role });
      }
    }
  });

  socket.on('disconnect', () => {
    for (const roomName in rooms) {
      // TO FIX, ROOMS ARE NEVER DELETED
      // rooms[roomName].players = rooms[roomName].players.filter(player => player.socketId !== socket.id);
      // if (rooms[roomName].players.length === 0) {
      //   delete rooms[roomName];
      // }
      // io.emit('roomsList', Object.keys(rooms)); // Diffuser la liste des salles à tous les clients
      // io.to(roomName).emit('roomData', rooms[roomName]?.players || []);
    }
    console.log('Client disconnected');
  });
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});