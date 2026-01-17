const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

const users = new Map();

io.on('connection', (socket) => {
  console.log(`New user connected: ${socket.id}`);
  
  socket.emit('message', {
    id: Date.now(),
    username: 'System',
    text: 'Welcome to the chat!',
    timestamp: new Date().toISOString(),
    type: 'system'
  });
  
  socket.on('join', (username) => {
    // Store user with socket ID
    users.set(socket.id, username);
    
    // Broadcast to all users that someone joined
    socket.broadcast.emit('message', {
      id: Date.now(),
      username: 'System',
      text: `${username} has joined the chat`,
      timestamp: new Date().toISOString(),
      type: 'system'
    });
    
    // Send current users list to the new user
    socket.emit('users', Array.from(users.values()));
    
    // Broadcast updated users list to all
    io.emit('users', Array.from(users.values()));
    
    console.log(`${username} joined the chat`);
  });
  
  // Listen for chat messages
  socket.on('message', (data) => {
    const username = users.get(socket.id) || 'Anonymous';
    const messageData = {
      id: Date.now(),
      username,
      text: data.text,
      timestamp: new Date().toISOString(),
      type: 'user'
    };
    
    // Broadcast message to all users
    io.emit('message', messageData);
    console.log(`Message from ${username}: ${data.text}`);
  });
  
  // Listen for typing indicator
  socket.on('typing', (isTyping) => {
    const username = users.get(socket.id);
    if (username) {
      socket.broadcast.emit('typing', {
        username,
        isTyping
      });
    }
  });
  
  socket.on('disconnect', () => {
    const username = users.get(socket.id);
    if (username) {
      users.delete(socket.id);
      
      io.emit('message', {
        id: Date.now(),
        username: 'System',
        text: `${username} has left the chat`,
        timestamp: new Date().toISOString(),
        type: 'system'
      });
      
      io.emit('users', Array.from(users.values()));
      
      console.log(`${username} left the chat`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});