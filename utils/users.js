const users = [];

// Присоединение пользователя к чату
function userJoin(id, username, room) {
    const exist = users.find(user => user.username === username);

    if (exist) {
        return false;
    }

    const user = { id, username, room };

    users.push(user);

    return user;
}

// Получение информации о пользователе
function getCurrentUser(id) {
    return users.find(user => user.id === id);
}

// Покинуть комнату
function userLeave(id) {
    const index = users.findIndex(user => user.id === id);

    // Возвращаем -1, если пользователь не найден
    if (index !== -1) {
        const leftUser = users[index];
        users.splice(index, 1);
        return leftUser;
    }
}

// Получение пользователей комнаты
function getRoomUsers(room) {
    return users.filter(user => user.room === room);
}

module.exports = {
    userJoin,
    getCurrentUser,
    userLeave,
    getRoomUsers
};