export const registerNotificationHandlers = (io, socket) => {
  console.log('Registering notification socket handlers for client:', socket.id);
  
  socket.on('join_notifications', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`Socket ${socket.id} joined notification room user_${userId}`);
  });
};
