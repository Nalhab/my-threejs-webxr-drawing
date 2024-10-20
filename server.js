import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const corsOptions = {
  origin: `http://${process.env.VITE_SERVER_HOST}:${process.env.VITE_CLIENT_PORT}`,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: `http://${process.env.VITE_SERVER_HOST}:${process.env.VITE_CLIENT_PORT}`,
    methods: ['GET', 'POST']
  }
});

const rooms = {};

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('storePlayerId', (playerId) => {
    socket.playerId = playerId;
  });

  socket.on('getPlayersIds', () => {
    const playersIds = [];
    io.sockets.sockets.forEach((s) => {
      playersIds.push(s.playerId || null);
    });
    socket.emit('playersIds', playersIds);
  });

  socket.on('getPlayerId', () => {
    io.emit('playerId', socket.playerId);
  });

  socket.on('getRooms', () => {
    socket.emit('roomsList', rooms);
  });

  socket.on('createRoom', ({ roomName, playerId }) => {
    for (const existingRoomName in rooms) {
      const playerIndex = rooms[existingRoomName].players.findIndex(player => player.id === playerId);
      if (playerIndex !== -1) {
        if (rooms[existingRoomName].players[playerIndex].role === 'Drawer') {
          delete rooms[existingRoomName];
          io.emit('roomsList', rooms);
        } else {
          rooms[existingRoomName].players.splice(playerIndex, 1);
          io.to(existingRoomName).emit('roomData', rooms[existingRoomName].players);
        }
        socket.leave(existingRoomName);
        break;
      }
    }

    if (rooms[roomName]) {
      socket.emit('roomExists');
      return;
    }

    rooms[roomName] = { players: [], gameStarted: false };
    io.emit('roomsList', rooms);

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
        socket.playerId = playerId;
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
    const isfromIndex = !socket.handshake.query.page.includes('game.html');

    if (isfromIndex) {
      for (const roomName in rooms) {
        if (!rooms[roomName].gameStarted && socket.playerId) {
          rooms[roomName].players = rooms[roomName].players.filter(player => {
            return player.id !== socket.playerId;
          });
          if (rooms[roomName].players.length === 0) {
            delete rooms[roomName];
          }
          io.emit('roomsList', rooms);
          io.to(roomName).emit('roomData', rooms[roomName]?.players || []);
        }
      }

      return;
    }

    for (const roomName in rooms) {
      const size = rooms[roomName].players.length;
      rooms[roomName].players = rooms[roomName].players.filter(player => {
        return player.id !== socket.playerId;
      }); 
      
      io.emit('roomsList', rooms);

      if (size !== rooms[roomName].players.length) {
        delete rooms[roomName];
        io.to(roomName).emit('gameEnded');
      }
    }
    console.log('Client disconnected');
  });
});

const PORT = process.env.VITE_SERVER_PORT || 3000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Server is running on port ${PORT}`);
});