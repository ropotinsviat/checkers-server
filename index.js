const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3030;

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

var rooms = [],
  queue = [];

const findBySocket = (socket) => {
  for (let i = 0; i < rooms.length; i++) {
    const [u1, u2] = rooms[i];
    if (u1.socket === socket || u2.socket === socket) return [rooms[i], i];
  }
  return [null, null];
};

io.on("connection", (socket) => {
  socket.on("joinRandomRoomRequest", (userName) => {
    const user = { socket: socket, name: userName };

    if (queue.length > 0) {
      const userInQueue = queue.pop();

      rooms.push([userInQueue, user]);
      // true - white | false - black
      userInQueue.socket.emit("statGame", [userName, true]);
      user.socket.emit("statGame", [userInQueue.name, false]);
    } else queue.push(user);
  });

  socket.on("sendBoard", (req) => {
    const [room, index] = findBySocket(socket);

    if (room) {
      if (!room[0].socket || !room[1].socket) {
        rooms.splice(index, 1);
        return;
      }
      if (room[0].socket === socket) room[1].socket.emit("getBoard", req);
      else room[0].socket.emit("getBoard", req);
    }
  });

  socket.on("ilost", (req) => {
    const [room, index] = findBySocket(socket);

    if (room) {
      rooms.splice(index, 1);
      const message = req ? "Black won!" : "White won!";
      if (room[0].socket) room[0].socket.emit("getWinner", message);
      if (room[1].socket) room[1].socket.emit("getWinner", message);
    }
  });

  socket.on("disconnect", () => {
    if (queue.length > 0)
      if (queue[0].socket === socket) {
        queue.pop();
        return;
      }

    const [room, index] = findBySocket(socket);

    if (room) {
      rooms.splice(index, 1);
      if (room[0].socket) room[0].socket.emit("getWinner", "Oponent left");
      if (room[1].socket) room[1].socket.emit("getWinner", "Oponent left");
    }
    console.log(socket.id + " disconnected");
  });
});

server.listen(PORT, () => {
  console.log("Server is running on port " + PORT);
});
