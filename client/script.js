document.addEventListener('DOMContentLoaded', () => {
const joinForm = document.getElementById('joinForm');
const messageInputContainer = document.getElementById('messageInputContainer');
const usernameInput = document.getElementById('usernameInput');
const joinButton = document.getElementById('joinButton');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const messagesContainer = document.getElementById('messagesContainer');
const usersList = document.getElementById('usersList');
const userNameElement = document.getElementById('userName');
const onlineCountElement = document.querySelector('.online-count');
const typingIndicator = document.getElementById('typingIndicator');
const emojiButton = document.getElementById('emojiButton');
const emojiModal = document.getElementById('emojiModal');
const emojiOverlay = document.getElementById('emojiOverlay');
const closeEmoji = document.getElementById('closeEmoji');
const emojiGrid = document.querySelector('.emoji-grid');
const charCount = document.getElementById('charCount');
const socket = io();
    
let currentUsername = '';
let isTyping = false;
let typingTimeout = null;
    
const emojis = ['😀', '😂', '😍', '😎', '😜', '😢', '👍', '👋', '🎉', '❤️', '🔥', '⭐', '🙏', '💯', '🤔', '👀', '✨', '💕', '🙌', '😊', '🤗', '😇', '🥳', '😴', '🤩'];
    
emojis.forEach(emoji => {
    const emojiElement = document.createElement('div');
        emojiElement.className = 'emoji-item';
        emojiElement.textContent = emoji;
        emojiElement.addEventListener('click', () => {
            messageInput.value += emoji;
            messageInput.focus();
            updateCharCount();
        });
        emojiGrid.appendChild(emojiElement);
    });
    
    emojiButton.addEventListener('click', () => {
        emojiModal.style.display = 'block';
        emojiOverlay.style.display = 'block';
    });
    
    closeEmoji.addEventListener('click', () => {
        emojiModal.style.display = 'none';
        emojiOverlay.style.display = 'none';
    });
    
    emojiOverlay.addEventListener('click', () => {
        emojiModal.style.display = 'none';
        emojiOverlay.style.display = 'none';
    });
    
    function updateCharCount() {
        const count = messageInput.value.length;
        charCount.textContent = count;
        
        if (count > 0 && count <= 500) {
            sendButton.disabled = false;
        } else {
            sendButton.disabled = true;
        }
    }
    
    messageInput.addEventListener('input', updateCharCount);
    
    joinButton.addEventListener('click', joinChat);
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinChat();
        }
    });
    
    function joinChat() {
        const username = usernameInput.value.trim();
        if (username) {
            currentUsername = username;
            userNameElement.textContent = username;
            
            socket.emit('join', username);
            
            joinForm.style.display = 'none';
            messageInputContainer.style.display = 'block';
            messageInput.focus();
            
            addMessage({
                id: Date.now(),
                username: 'System',
                text: `Welcome, ${username}! You've joined the chat.`,
                timestamp: new Date().toISOString(),
                type: 'system'
            });
        } else {
            alert('Please enter a username');
        }
    }
    
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !sendButton.disabled) {
            sendMessage();
        }
    });
    
    function sendMessage() {
        const text = messageInput.value.trim();
        if (text) {
            socket.emit('message', { text });
            
            messageInput.value = '';
            updateCharCount();
            
            if (isTyping) {
                socket.emit('typing', false);
                isTyping = false;
            }
        }
    }
    
    messageInput.addEventListener('input', () => {
        if (!isTyping) {
            isTyping = true;
            socket.emit('typing', true);
        }
        
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
        
        typingTimeout = setTimeout(() => {
            if (isTyping) {
                isTyping = false;
                socket.emit('typing', false);
            }
        }, 1000);
    });
    
    socket.on('connect', () => {
        console.log('Connected to server');
    });
    
    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        addMessage({
            id: Date.now(),
            username: 'System',
            text: '⚠️ Connection error. Please refresh the page.',
            timestamp: new Date().toISOString(),
            type: 'system'
        });
    });
    
    socket.on('message', (data) => {
        addMessage(data);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
    
    socket.on('users', (users) => {
        updateUsersList(users);
    });
    
    socket.on('typing', (data) => {
        updateTypingIndicator(data);
    });
    
    function addMessage(data) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${data.type === 'system' ? 'system-message' : 
                                   data.username === currentUsername ? 'user-message' : 'other-message'}`;
        
        const time = data.timestamp ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const safeText = data.text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="message-user">${data.username}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-text">${safeText}</div>
        `;
        
        messagesContainer.appendChild(messageElement);
    }
    
    function updateUsersList(users) {
        usersList.innerHTML = '';
        
        if (users.length === 0) {
            const emptyElement = document.createElement('div');
            emptyElement.className = 'empty-users';
            emptyElement.textContent = 'No users online';
            usersList.appendChild(emptyElement);
        } else {
            users.forEach(user => {
                const userElement = document.createElement('div');
                userElement.className = 'user-item';
                const safeUser = user.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                userElement.innerHTML = `
                    <i class="fas fa-user-circle"></i>
                    <span>${safeUser}</span>
                `;
                usersList.appendChild(userElement);
            });
        }
        onlineCountElement.textContent = users.length;
    }
    
    function updateTypingIndicator(data) {
        if (data.isTyping && data.username !== currentUsername) {
            typingIndicator.innerHTML = `<i class="fas fa-pencil-alt"></i> ${data.username} is typing...`;
            typingIndicator.style.display = 'block';
        } else {
            typingIndicator.style.display = 'none';
        }
    }

    updateCharCount();

    window.addEventListener('beforeunload', () => {
        if (currentUsername) {
            socket.emit('disconnect');
        }
    });
    
    console.log('Real-Time Chat Application initialized');
});