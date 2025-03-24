const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

let activeRooms = {}; // Track active rooms

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Handle room creation
    socket.on("create_room", (room) => {
        if (!activeRooms[room]) {
            activeRooms[room] = []; // Create a new room
        }
        activeRooms[room].push(socket.id);
        socket.join(room);
        console.log(`Room ${room} created by ${socket.id}`);
    });

    // Check if a room exists
    socket.on("check_room", (room, callback) => {
        const roomExists = activeRooms[room] && activeRooms[room].length > 0;
        console.log(`Checking room ${room}: Exists - ${roomExists}`);
        callback(roomExists);
    });

    // Handle room joining
    socket.on("join_room", (room) => {
        if (activeRooms[room]) {
            activeRooms[room].push(socket.id);
            socket.join(room);
            console.log(`${socket.id} joined room ${room}`);
            io.to(room).emit("user_status", { online: activeRooms[room].length });
        }
    });

    // Handle messages
    socket.on("send_message", ({ room, message, sender, replyTo }) => {
        io.to(room).emit("receive_message", { message, sender, replyTo });
    });

    // Handle typing indicator
    socket.on("typing", ({ room, isTyping }) => {
        socket.to(room).emit("user_typing", { isTyping });
    });

    // Handle user disconnect
    socket.on("disconnect", () => {
        for (const room in activeRooms) {
            activeRooms[room] = activeRooms[room].filter(id => id !== socket.id);
            if (activeRooms[room].length === 0) delete activeRooms[room];
            io.to(room).emit("user_status", { online: activeRooms[room]?.length || 0 });
        }
        console.log("User disconnected:", socket.id);
    });
});

server.listen(5000, () => {
    console.log("Server running on port 5000");
});
