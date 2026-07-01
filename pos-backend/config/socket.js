const { Server } = require("socket.io");
const auth = require("./auth");
const prisma = require("./prisma");
const config = require("./config");

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: config.frontendUrl,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const session = await auth.api.getSession({
        headers: socket.handshake.headers,
      });
      if (!session?.user?.id) return next(new Error("Unauthorized"));

      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { restaurant: { select: { status: true } } },
      });
      if (!user) return next(new Error("Unauthorized"));

      socket.user = user;
      next();
    } catch (_error) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user.id}`);
    if (socket.user.role === "SUPER_ADMIN") socket.join("platform:admin");
    if (socket.user.restaurantId && socket.user.restaurant?.status === "APPROVED") {
      socket.join(`restaurant:${socket.user.restaurantId}`);
    }
  });

  return io;
};

const getIo = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};

module.exports = { initSocket, getIo };
