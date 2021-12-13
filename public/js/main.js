const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');
const inputMessage =document.getElementById('msg');
const TYPING_TIMER_LENGTH = 400; // ms

const videoGrid = document.getElementById('video-grid');
const myVideo = document.createElement('video');

myVideo.muted = true

const muteButton = document.querySelector("#muteButton");
const stopVideo = document.querySelector("#stopVideo");

muteButton.addEventListener("click", () => {
    const enabled = userVideoStream.getAudioTracks()[0].enabled;
    if (enabled) {
        userVideoStream.getAudioTracks()[0].enabled = false;
    } else {
        userVideoStream.getAudioTracks()[0].enabled = true;
    }
});

stopVideo.addEventListener("click", () => {
    const enabled = userVideoStream.getVideoTracks()[0].enabled;
    if (enabled) {
        userVideoStream.getVideoTracks()[0].enabled = false;
    } else {
        userVideoStream.getVideoTracks()[0].enabled = true;
    }
});


const myPeer = new Peer(undefined, {
    path: "/peerjs",
    host: '/',
    port: 443,
    secure: true,
})
// const myPeer = new Peer(undefined, {
//     host: 'localhost',
//     port: '3001'
// })
const peers = {}

let typing = false;
let lastTypingTime;

// Получение информации о пользователе и комнате
// ignoreQueryPrefix ignores the leading question mark. Can also use require('query-string')
const { username, room} = Qs.parse(location.search, {
    ignoreQueryPrefix: true
});

const socket = io();

// Проверка на сущ. пользователей
socket.on('sameName', () => {
    alert("Username already exist, please choose another username.");
    window.history.back();
});

// Проверка на наличие комнаты
socket.on('roomNotValid', () => {
    alert("Room does not exist, please select either Room № 1,Room № 2 or Room № 3");
    window.history.back();
});

// Получение медиа-контента пользователя
let userVideoStream;
navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    userVideoStream = stream;
    addVideoStream(myVideo, userVideoStream);

    myPeer.on('call', call => {
        call.answer(userVideoStream)
        const video = document.createElement('video')
        call.on('stream', userVideoStream => {
            addVideoStream(video, userVideoStream)
        })
    })

    socket.on('user-connected', userId => {
        // connectToNewUser(userId, stream)
        console.log(userId)
        // make sure myPeer.on('call') has been executed first
        setTimeout(connectToNewUser,1000,userId,stream)
    })
})

socket.on('user-disconnected', userId => {
    if (peers[userId]) peers[userId].close()
})

myPeer.on('open', userPeerId => {
    // При подключении к чату
    socket.emit('joinRoom', { userPeerId, username, room });
})

function connectToNewUser(userId, stream) {
    const call = myPeer.call(userId, stream)
    const video = document.createElement('video')
    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream)
    })
    call.on('close', () => {
        video.remove()
    })

    peers[userId] = call
}

function addVideoStream(video, stream) {
    video.srcObject = stream
    video.addEventListener('loadedmetadata', () => {
        video.play()
    })
    videoGrid.append(video)
}

// Получение информации о комнатах и пользователях
socket.on('roomUsers', ({ room, users }) => {
    outputRoomName(room);
    outputUsers(users);
});

inputMessage.addEventListener("input", () => {
    updateTyping();
});

// Updates the typing event
const updateTyping = () => {
    if (!typing) {
        typing = true;
        socket.emit('typing');
    }
    lastTypingTime = (new Date()).getTime();

    setTimeout(() => {
    const typingTimer = (new Date()).getTime();
    const timeDiff = typingTimer - lastTypingTime;
    if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
        socket.emit('stop typing');
        typing = false;
    }
    }, TYPING_TIMER_LENGTH);
}

socket.on('typing', (data) => {
    addChatTyping(data);
});

// Whenever the server emits 'stop typing', kill the typing message
socket.on('stop typing', (data) => {
    removeChatTyping(data);
});

// Adds the visual chat typing message
const addChatTyping = (data) => {
    data.typing = true;
    data.message = ' is typing..';
    addTypingMessage(data);
}

// Removes the visual chat typing message
const removeChatTyping = (data) => {
    const typingElement = document.getElementsByClassName('typing')

    while (typingElement.length > 0) typingElement[0].remove();
}

 // Отображение сообщений
 const addTypingMessage = (data, options) => {
    const typingClass = data.typing ? 'typing' : '';
    const div = document.createElement('div');
    div.classList.add(typingClass);

    const p = document.createElement('p');
    p.innerText = data.username + data.message;

    div.appendChild(p);

    document.querySelector('.is-typing').appendChild(div);
}

// Message from server
socket.on('message', message => {
    console.log(message);
    outputMessage(message);

    // Scroll bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Отправка сообщений
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // получение текста сообщения
    const msg = e.target.elements.msg.value;


    socket.emit('chatMessage', msg);
    socket.emit('stop typing');
    typing = false;

    // Отчистка формы
    e.target.elements.msg.value = '';
    e.target.elements.msg.focus();
});

// Вывод сообщений
function outputMessage(message) {
    const div = document.createElement('div');
    div.classList.add('message');

    const p = document.createElement('h4');
    p.classList.add('meta');
    p.innerText = message.username + ' ';

    const spanTime = document.createElement('h6');
    spanTime.innerText ='at ' + message.time;

    p.appendChild(spanTime);

    div.appendChild(p);

    const para = document.createElement('p');
    para.className = 'lead';
    para.classList.add('text');
    para.innerText = message.text;

    div.appendChild(para);

    document.querySelector('.chat-messages').appendChild(div);
}

// Добавление название комнаты в DOM
function outputRoomName(room) {
    roomName.innerText = room;
}

// Добавление списка пользователей в DOM
function outputUsers(users) {
    userList.innerHTML = `
        ${users.map(user => `<li class="dropdown-item" >${user.username}</li>
   <li><hr class="dropdown-divider"></li>`).join('')}
    `;
}

