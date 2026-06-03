class SocketService {
  io = null;

  init(ioInstance) {
    this.io = ioInstance;
    console.log('SocketService initialized with IO instance');
  }

  emitToUser(userId, eventName, data) {
    if (this.io) {
      this.io.to(`user_${userId}`).emit(eventName, data);
    }
  }

  emitToGroup(groupId, eventName, data) {
    if (this.io) {
      this.io.to(`group_${groupId}`).emit(eventName, data);
    }
  }
}

export const socketService = new SocketService();
