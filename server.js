const path = require('path');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io =  require('socket.io')(server);
const formatMessage = require('./utils/messages');
const { userJoin, getCurrentUser, userLeave, getRoomUsers } = require('./utils/users');

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

// Роутинг
app.use(express.static(path.join(__dirname, 'public')));

const botName = 'Chat';
const ACCEPTED_ROOMS = ["Room №1", "Room №2", "Room №3"];

// Запуск при подключении
io.on('connection', socket => {
    socket.on('joinRoom', ({ userPeerId, username, room }) => {
        if (!ACCEPTED_ROOMS.includes(room)) {
            socket.emit('roomNotValid');
        }

        const user = userJoin(userPeerId, username, room);

        if (!user) {
            socket.emit('sameName');
        } else {

            socket.join(user.room);
        
            // Отображение на клиенте
            socket.emit('message', formatMessage(botName, 'Welcome to Chat!'));

            // Подключение к видео трансляции
            socket.broadcast
                .to(user.room)
                .emit(
                    'message',
                    formatMessage(botName, `${user.username} has joined the chat`)
                );

            socket.broadcast.to(user.room).emit('user-connected', userPeerId)

            // Отправка информации о комнате и пользователе
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getRoomUsers(user.room) // E.g return: [{id: '6JhtU8cQGMZzzzj5AAAB', username: 'evg', room: 'Room №1'}]
            });

            socket.on('typing', () => {
                console.log('typing');

                socket.broadcast
                    .to(user.room)
                    .emit('typing', {
                        username: user.username
                    });
            });

            socket.on('stop typing', () => {
                console.log('stop typing');

                socket.broadcast
                    .to(user.room)
                    .emit('stop typing', {
                        username: user.username
                    });
            });

            // Listener для чата
            socket.on('chatMessage', msg => {
                const user = getCurrentUser(userPeerId);

                // Broadcast для всех клиентов
                io
                    .to(user.room)
                    .emit('message', formatMessage(user.username, msg));
            });

            // При дисконекте пользователя
            socket.on('disconnect', () => {
                const user = userLeave(userPeerId);

                if (user) {
                    io
                    .to(user.room)
                    .emit('message', formatMessage(botName, `${user.username} has left the chat`));
                }

                // Отправка информации
                io.to(user.room).emit('roomUsers', {
                    room: user.room,
                    users: getRoomUsers(user.room)
                });

                socket.broadcast.to(user.room).emit('user-disconnected', userPeerId)
            });
        }
    });

});