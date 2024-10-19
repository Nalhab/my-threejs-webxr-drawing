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

  socket.on('getRooms', () => {
    socket.emit('roomsList', rooms);
  });

  socket.on('createRoom', ({ roomName, playerId }) => {
    // Check if the player is already in a room
    for (const existingRoomName in rooms) {
      const playerIndex = rooms[existingRoomName].players.findIndex(player => player.id === playerId);
      if (playerIndex !== -1) {
        // If the player is the Drawer, delete the old room
        if (rooms[existingRoomName].players[playerIndex].role === 'Drawer') {
          delete rooms[existingRoomName];
          io.emit('roomsList', rooms);
        } else {
          // If the player is not the Drawer, just remove them from the room
          rooms[existingRoomName].players.splice(playerIndex, 1);
          io.to(existingRoomName).emit('roomData', rooms[existingRoomName].players);
        }
        socket.leave(existingRoomName);
        break;
      }
    }

    // Check if the room name already exists
    if (rooms[roomName]) {
      socket.emit('roomExists');
      return;
    }

    // Create the new room
    rooms[roomName] = { players: [], gameStarted: false };
    io.emit('roomsList', rooms);

    // Add the player to the new room as the Drawer
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

    io.emit('roomsList', rooms);
  });

  socket.on('joinGame', ({ roomName, playerId }) => {
    const room = rooms[roomName]?.players;
    if (room) {
      const player = room.find(p => p.id === playerId);
      if (player) {
        socket.join(roomName);
        socket.emit('playerData', { role: player.role });
      }
    }
  });

  socket.on('draw', ({roomName, position, color, layer }) => {
    io.to(roomName).emit('draw', {position, color, layer});
  });

  socket.on('nextLayer', ({roomName}) => {
    io.to(roomName).emit('nextLayer');
  });

  socket.on('previousLayer', ({roomName}) => {
    io.to(roomName).emit('previousLayer');
  });

  socket.on('undo', ({roomName, trace}) => {
    io.to(roomName).emit('undo', trace);
  });

  socket.on('addTrace', ({roomName}) => {
    io.to(roomName).emit('addTrace');
  });

  socket.on('disconnect', () => {
    const isfromIndex = socket.handshake.headers.referer.includes('index.html');
    console.log(socket.handshake.headers.referer);
    console.log(isfromIndex);

    //verify if the game was started
    for (const roomName in rooms) {
      if (!rooms[roomName].gameStarted) {
        rooms[roomName].players = rooms[roomName].players.filter(player => player.socketId !== socket.id);
        if (rooms[roomName].players.length === 0) {
          delete rooms[roomName];
        }
        io.emit('roomsList', rooms);
        io.to(roomName).emit('roomData', rooms[roomName]?.players || []);
      }
    }

    if (isfromIndex) {
      console.log('Client disconnected');
      return
    }

    for (const roomName in rooms) {
      rooms[roomName].players = rooms[roomName].players.filter(player => player.socketId !== socket.id);
      console.log(rooms[roomName].players);
      delete rooms[roomName];
      io.emit('roomsList', rooms);
      io.to(roomName).emit('gameEnded');
      io.to(roomName).emit('roomData', rooms[roomName]?.players || []);
    }
    console.log('Client disconnected');
  });
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});