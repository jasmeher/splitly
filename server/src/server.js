import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { connectDB } from './config/db.config.js';
import { socketConfig } from './config/socket.config.js';
import { socketService } from './services/socket.service.js';
import { registerNotificationHandlers } from './sockets/notification.socket.js';
import { registerExpenseHandlers } from './sockets/expense.socket.js';

const PORT = process.env.PORT || 5000;

// Create HTTP Server
const server = http.createServer(app);

// Mount Socket.IO
const io = new Server(server, socketConfig);

// Initialize Global Socket Service wrapper
socketService.init(io);

// Socket Connection Manager
io.on('connection', (socket) => {
  console.log(`Socket client connected: ${socket.id}`);
  
  // Register specific handlers
  registerNotificationHandlers(io, socket);
  registerExpenseHandlers(io, socket);
  
  socket.on('disconnect', () => {
    console.log(`Socket client disconnected: ${socket.id}`);
  });
});

// Boot Database & Server
const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`Server is listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
  }
};

startServer();
