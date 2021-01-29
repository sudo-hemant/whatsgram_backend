const express = require('express')
const socketio = require('socket.io')
const http = require('http')
const cors = require('cors')

const app = express()
const server = http.createServer(app)

const router = require('./router')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./users')

const PORT = process.env.PORT || 5000
let whitelist = [ "http://localhost:3000", "http://localhost:5000", "https://whatsgram.netlify.app/" ]

const io = socketio(server, { 
    cors : {
        origin : "*"
    }
 })

var corsOptions = {
    origin: (origin, callback) => {
        if (whitelist.indexOf(origin) !== -1 || !origin) {
            callback(null, true)
        } else {
            callback(new Error("not allowed by CORS !"))
        }
    },
    optionsSuccessStatus: 200,
};

app.use(cors(corsOptions))
app.use(router)

io.on('connection', socket => {
    socket.on('join', ({ name, room }, callback) => {
        const { error, user } = addUser({ id : socket.id, name, room });        

        if (error) {
            return callback(error)
        }
        
        console.log('user joined')

        socket.join(user.room);

        socket.emit('message', { user : 'admin', text : `${user.name}, welcome to the room ${user.room}` });
        socket.broadcast.to(user.room).emit('message', { user : 'admin', text : `${user.name} has joined the room !`})

        // io.to(user.room).emit('roomData', { room : user.room, users : getUsersInRoom(user.room) })
        
        callback()
    })

    socket.on('sendMessage', ( message, callback) => {
        const user = getUser(socket.id)

        io.to(user.room).emit('message', { user : user.name, text : message })
        // io.to(user.room).emit('roomData', { room : user.room, users : getUsersInRoom(user.room) })

        callback();
    })
    
    socket.on('disconnect', () => {
        const user = removeUser(socket.id);

        if (user) {
            io.to(user.room).emit('message', { user: 'admin', text : `${user.name} has left the meeting !`})
        } 
    })
})

server.listen( PORT, () => console.log(`Server is ruuning on ${PORT}`) )