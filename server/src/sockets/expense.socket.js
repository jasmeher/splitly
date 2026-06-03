export const registerExpenseHandlers = (io, socket) => {
  console.log('Registering expense socket handlers for client:', socket.id);
  
  socket.on('join_group_room', (groupId) => {
    socket.join(`group_${groupId}`);
    console.log(`Socket ${socket.id} joined group room group_${groupId}`);
  });

  socket.on('typing_comment', ({ groupId, username }) => {
    socket.to(`group_${groupId}`).emit('user_typing', { username });
  });
};
