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
    
    // Build emoji grid
    emojis.forEach(emoji => {
        const emojiElement = document.createElement('div');
        emojiElement.className = 'emoji-item';
        emojiElement.textContent = emoji;
        emojiElement.addEventListener('click', () => {
            const start = messageInput.selectionStart;
            const end = messageInput.selectionEnd;
            messageInput.value = messageInput.value.substring(0, start) + emoji + messageInput.value.substring(end);
            messageInput.selectionStart = messageInput.selectionEnd = start + emoji.length;
            messageInput.focus();
            updateCharCount();
            // Trigger input event for typing indicator
            messageInput.dispatchEvent(new Event('input'));
        });
        emojiGrid.appendChild(emojiElement);
    });
    
    // Emoji modal controls
    emojiButton.addEventListener('click', () => {
        emojiModal.style.display = 'block';
        emojiOverlay.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent scrolling on mobile
    });
    
    const closeEmojiModal = () => {
        emojiModal.style.display = 'none';
        emojiOverlay.style.display = 'none';
        document.body.style.overflow = '';
    };
    
    closeEmoji.addEventListener('click', closeEmojiModal);
    emojiOverlay.addEventListener('click', closeEmojiModal);
    
    // Close emoji modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeEmojiModal();
        }
    });
    
    function updateCharCount() {
        const count = messageInput.value.length;
        charCount.textContent = count;
        
        if (count > 0 && count <= 500) {
            sendButton.disabled = false;
        } else {
            sendButton.disabled = true;
        }
        
        // Visual feedback for character limit
        if (count > 450) {
            charCount.style.color = '#ff6b6b';
        } else {
            charCount.style.color = '#7f8c8d';
        }
    }
    
    messageInput.addEventListener('input', updateCharCount);
    
    // Handle join
    joinButton.addEventListener('click', joinChat);
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinChat();
        }
    });
    
    // Auto-focus username input on mobile
    if ('ontouchstart' in window) {
        setTimeout(() => {
            usernameInput.focus();
        }, 500);
    }
    
    function joinChat() {
        const username = usernameInput.value.trim();
        if (username) {
            currentUsername = username;
            userNameElement.textContent = username;
            
            socket.emit('join', username);
            
            joinForm.style.display = 'none';
            messageInputContainer.style.display = 'block';
            
            // Focus on mobile with slight delay
            setTimeout(() => {
                messageInput.focus();
            }, 100);
            
            addMessage({
                id: Date.now(),
                username: 'System',
                text: `Welcome, ${username}! You've joined the chat.`,
                timestamp: new Date().toISOString(),
                type: 'system'
            });
        } else {
            // Mobile-friendly alert
            usernameInput.style.borderColor = '#ff6b6b';
            usernameInput.style.boxShadow = '0 0 0 3px rgba(255, 107, 107, 0.2)';
            setTimeout(() => {
                usernameInput.style.borderColor = '#e0e0e0';
                usernameInput.style.boxShadow = 'none';
            }, 2000);
            
            // Show feedback without alert
            const note = document.querySelector('.form-note');
            const originalText = note.textContent;
            note.textContent = '⚠️ Please enter your name to join!';
            note.style.color = '#ff6b6b';
            setTimeout(() => {
                note.textContent = originalText;
                note.style.color = '#7f8c8d';
            }, 2000);
        }
    }
    
    // Send message
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !sendButton.disabled) {
            e.preventDefault();
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
                isTyping = false;
                socket.emit('typing', false);
                clearTimeout(typingTimeout);
            }
            
            // Keep focus on mobile
            if ('ontouchstart' in window) {
                setTimeout(() => {
                    messageInput.focus();
                }, 50);
            }
        }
    }
    
    // Typing indicator with debounce
    messageInput.addEventListener('input', () => {
        if (!isTyping && messageInput.value.trim().length > 0) {
            isTyping = true;
            socket.emit('typing', true);
        } else if (messageInput.value.trim().length === 0 && isTyping) {
            isTyping = false;
            socket.emit('typing', false);
        }
        
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
        
        typingTimeout = setTimeout(() => {
            if (isTyping && messageInput.value.trim().length > 0) {
                // Still typing, send typing event again to keep it alive
                socket.emit('typing', true);
            }
        }, 5000);
        
        // Clear typing after user stops
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            if (isTyping) {
                isTyping = false;
                socket.emit('typing', false);
            }
        }, 1500);
    });
    
    // Socket events
    socket.on('connect', () => {
        console.log('Connected to server');
        // Update connection status
        const status = document.querySelector('.connection-status');
        if (status) {
            status.className = 'connection-status connected';
            status.innerHTML = '<i class="fas fa-circle"></i> Connected';
        }
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        const status = document.querySelector('.connection-status');
        if (status) {
            status.className = 'connection-status disconnected';
            status.innerHTML = '<i class="fas fa-circle"></i> Disconnected';
        }
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
        scrollToBottom();
    });
    
    socket.on('users', (users) => {
        updateUsersList(users);
    });
    
    socket.on('typing', (data) => {
        updateTypingIndicator(data);
    });
    
    // Reconnection handling
    socket.on('reconnect', () => {
        console.log('Reconnected to server');
        if (currentUsername) {
            socket.emit('join', currentUsername);
        }
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
        
        // Remove welcome message when first message arrives
        const welcomeMsg = document.querySelector('.welcome-message');
        if (welcomeMsg && data.type !== 'system') {
            welcomeMsg.remove();
        }
        
        messagesContainer.appendChild(messageElement);
        scrollToBottom();
    }
    
    function scrollToBottom() {
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 50);
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
                // Add tap feedback for mobile
                userElement.addEventListener('click', () => {
                    // Could be used for @mention or profile view
                    console.log('User clicked:', safeUser);
                });
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

    // Initial character count update
    updateCharCount();

    // Handle window resize for mobile adjustments
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Adjust message container height if needed
            scrollToBottom();
        }, 250);
    });

    // Handle beforeunload
    window.addEventListener('beforeunload', () => {
        if (currentUsername) {
            socket.emit('disconnect');
        }
    });

    // Mobile: Handle keyboard show/hide
    if ('ontouchstart' in window) {
        window.addEventListener('focusin', (e) => {
            if (e.target === messageInput || e.target === usernameInput) {
                setTimeout(scrollToBottom, 300);
            }
        });
    }
    
    console.log('Real-Time Chat Application initialized');
    console.log('💬 Mobile-responsive chat ready!');
});