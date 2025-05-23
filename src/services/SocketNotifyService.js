'use strict';
const { getClient } = require('../libs/redis');
const { jwt } = require('../libs');

class SocketService {
  constructor () {
    this.sub = getClient();
    this.pub = getClient();
    this.sockets = {};
    this.sub.subscribe('complex-all');
    this.sub.on('message', this._onMessage.bind(this));

    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'stage') {
      // Debug
      setInterval(() => {
        if (Object.keys(this.sockets).length > 0) {
          this.notifyAll({
            name: 'test',
            payload: {
              hello: 'world'
            }
          });
        }
      }, 60000).unref();
    }
  }

  async addConnection (socket, token) {
    socket.id = Math.random();
    try {
      const { id: userId } = await jwt.decode(token, process.env.JWT_SECRET);

      this.addUserWithSocket(userId, socket);

      socket.onclose = () => {
        this.removeUserWithSocket(userId, socket);
      };
    } catch (err) {
      socket.close(4000, JSON.stringify(err));
    }
  }

  addUserWithSocket (userId, socket) {
    userId = `complex-${userId.toString()}`;
    this.sockets[socket.id] = {
      userId,
      socket
    };
    this.sub.subscribe(userId);
  }

  removeUserWithSocket (userId, socket) {
    userId = `complex-${userId.toString()}`;
    delete this.sockets[socket.id];
    let isUser = false;
    for (const { userId: uuu } of Object.values(this.sockets)) {
      if (uuu === userId) {
        isUser = true;
        break;
      }
    }
    if (!isUser) {
      this.sub.unsubscribe(userId);
    }
  }

  notify ({ userId, name, payload }) {
    userId = `complex-${userId.toString()}`;
    this.pub.publish(userId, JSON.stringify({
      name,
      payload
    }));
  }

  notifyAll ({ name, payload }) {
    this.pub.publish('complex-all', JSON.stringify({
      name,
      payload
    }));
  }

  _onMessage (channel, message) {
    if (channel === 'complex-all') {
      Object.values(this.sockets).forEach(obj => {
        const { socket } = obj;
        socket.send(message);
      });
    } else {
      for (const [, { userId, socket }] of Object.entries(this.sockets)) {
        console.log(userId, channel);
        if (userId === channel) {
          socket.send(message);
        }
      }
    }
  }
}

const SocketNotifyService = new SocketService();

module.exports = SocketNotifyService;
