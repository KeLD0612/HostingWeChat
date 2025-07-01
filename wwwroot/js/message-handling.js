function displayMessage(message) {
    console.log('=== displayMessage DEBUG START ===');
    console.log('Message data:', {
        id: message.id,
        senderId: message.senderId,
        senderName: message.senderName,
        content: message.content,
        timestamp: message.timestamp,
        isSender: message.isSender,
        messageType: message.messageType,
        isRecalled: message.isRecalled,
        isDeletedByReceiver: message.isDeletedByReceiver,
        repliedMessageId: message.repliedMessageId,
        repliedMessage: message.repliedMessage,
        isPinned: message.isPinned,
        currentUserId: currentUserId
    });

    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) {
        console.error('Messages container not found');
        return;
    }

    if (!message.id || isNaN(parseInt(message.id))) {
        console.error('Invalid messageId:', message.id);
        showNotification('Lỗi hiển thị tin nhắn: ID không hợp lệ', 'error');
        return;
    }

    if (!currentUserId) {
        console.warn('currentUserId is undefined. Cannot determine message ownership.');
    }

    const isMyMessage = message.isSender === true;

    const messageElement = document.createElement('div');
    messageElement.className = `message-item ${isMyMessage ? 'message-mine' : 'message-other'}`;
    messageElement.id = `message-${message.id}`;
    messageElement.dataset.messageId = message.id;
    messageElement.dataset.senderId = message.senderId;
    messageElement.dataset.isRecalled = message.isRecalled || false;

    // Thêm class nếu tin nhắn bị xóa bởi người nhận
    if (message.isDeletedByReceiver) {
        messageElement.classList.add('deleted-by-receiver');
    }

    const formattedTimestamp = new Date(message.timestamp).toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    // Xử lý nội dung theo messageType và recalled status
    let contentHtml;

    // Kiểm tra nếu tin nhắn bị thu hồi
    if (message.isRecalled) {
        contentHtml = '<i class="fas fa-undo text-muted"></i> <em>Tin nhắn đã được thu hồi</em>';
        messageElement.classList.add('recalled');
    } else {
        // Xử lý bình thường theo messageType
        switch (message.messageType) {
            case 'voice':
                contentHtml = `
                    <audio controls src="${message.content}" style="max-width: 100%;">
                        Your browser does not support the audio element.
                    </audio>
                `;
                break;
            case 'image':
                contentHtml = `<img src="${message.content}" alt="Image" style="max-width: 300px; max-height: 300px; border-radius: 8px; cursor: pointer;" onclick="openImageFullscreen('${message.content}')" />`;
                break;
            case 'video':
                contentHtml = `
                    <video controls src="${message.content}" style="max-width: 300px; max-height: 300px; border-radius: 8px;">
                        Your browser does not support the video element.
                    </video>
                `;
                break;
            case 'document':
                contentHtml = `<a href="${message.content}" target="_blank">Tài liệu: ${message.content.split('/').pop()}</a>`;
                break;
            case 'emoji':
                contentHtml = `<span class="emoji-message">${message.content}</span>`;
                break;
            case 'sticker':
                // Hiển thị sticker chính xác
                contentHtml = `<div class="sticker-message"><img src="${message.content}" alt="Sticker" loading="lazy" style="max-width: 120px; max-height: 120px; object-fit: contain;"></div>`;
                break;
            // Thêm case để xử lý tin nhắn vị trí trong switch trong hàm displayMessage
            // Thêm đoạn code này vào switch (message.messageType) trong hàm displayMessage

            // Đoạn code này nên được chèn trong switch trong hàm displayMessage,
            // sau các case hiện có và trước case default:

            case 'location':
                // Xử lý tin nhắn vị trí đặc biệt
                const locationData = message.content;
                contentHtml = `
        <div class="location-message">
            <div class="location-header mb-2">
                <i class="fas fa-map-marker-alt me-1 text-danger"></i>
                <span class="location-name">${locationData.locationName}</span>
            </div>
            <div class="location-map-container" onclick="openLocationInMaps(${locationData.latitude}, ${locationData.longitude})">
                <img src="${locationData.mapImageUrl}" 
                     alt="Location Map" 
                     class="location-map-image img-fluid rounded" 
                     style="max-width: 300px; cursor: pointer;"
                     loading="lazy" />
                <div class="location-overlay">
                    <i class="fas fa-external-link-alt"></i> Mở trong Maps
                </div>
            </div>
            <div class="location-coordinates small text-muted mt-1">
                ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}
            </div>
        </div>
    `;
                break;
            default:
                contentHtml = message.content || '[No content]';
        }
    }

    // Thêm indicator nếu tin nhắn bị xóa bởi người nhận (chỉ hiển thị cho người gửi)
    if (message.isDeletedByReceiver && isMyMessage) {
        contentHtml += '<small class="text-muted d-block mt-1"><i class="fas fa-trash"></i> Tin nhắn đã bị người nhận xóa</small>';
    }

    // Nếu tin nhắn có reply
    let replyHtml = '';
    if (message.repliedMessageId && message.repliedMessage) {
        replyHtml = `
            <div class="reply-preview mb-2 p-2 rounded" 
                 style="background: rgba(0,0,0,0.05); border-left: 2px solid #0084ff; cursor: pointer;"
                 onclick="scrollToMessage('message-${message.repliedMessageId}')">
                <div class="small fw-bold" style="color: #0084ff;">
                    ${message.repliedMessage.senderName || 'Unknown'}
                </div>
                <div class="small text-muted" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${message.repliedMessage.content.substring(0, 50)}${message.repliedMessage.content.length > 50 ? '...' : ''}
                </div>
            </div>
        `;
    }

    // Tạo HTML cho tin nhắn
    messageElement.innerHTML = `
    <div class="d-flex align-items-start mb-3 ${isMyMessage ? 'justify-content-end' : 'justify-content-start'}">
        ${!isMyMessage ? `
        <div class="rounded-circle bg-primary d-flex align-items-center justify-content-center me-2"
             style="width: 30px; height: 30px; flex-shrink: 0;">
            <i class="fas fa-user text-white"></i>
        </div>
        ` : ''}
        
        <div class="message-wrapper" style="max-width: 70%;">
            <div class="d-flex align-items-center mb-1 ${isMyMessage ? 'justify-content-end' : 'justify-content-start'}">
                <strong class="message-sender ${isMyMessage ? 'text-end' : 'text-start'}">${isMyMessage ? 'Bạn' : message.senderName || 'Unknown'}</strong>
                <small class="text-muted ms-2">${formattedTimestamp}</small>
            </div>
            <div class="d-flex align-items-center ${isMyMessage ? 'justify-content-end' : 'justify-content-start'}">
                <div class="message-content ${isMyMessage ? 'bg-messenger-blue text-white' : 'bg-light text-dark'} p-2 rounded position-relative" 
                     style="word-break: break-word; max-width: 100%;"
                     data-message-type="${message.messageType}">
                    ${replyHtml}
                    ${contentHtml}
                </div>
                
                <!-- Reaction Button -->
                <button class="reaction-btn ms-1" 
                        onclick="toggleReactionPicker(event, ${message.id})"
                        style="opacity: 0; transition: opacity 0.2s;"
                        title="Thêm cảm xúc">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                        <line x1="9" y1="9" x2="9.01" y2="9"></line>
                        <line x1="15" y1="9" x2="15.01" y2="9"></line>
                    </svg>
                </button>
                
                <button class="message-options-btn ms-1" 
                        onclick="showMessageOptions(event, ${message.id}, 'message-${message.id}', ${isMyMessage})" 
                        style="opacity: 0.7; transition: opacity 0.2s;">
                    ⋮
                </button>
            </div>
            
            <!-- Reactions Display -->
            <div class="reactions-container" id="reactions-${message.id}">
                ${message.reactions && message.reactions.length > 0 ? displayReactionsWithMessageId(message.reactions, message.id) : ''}
            </div>
            
            <!-- Reaction Picker -->
            <div class="reaction-picker" id="reaction-picker-${message.id}" style="display: none;">
                <span class="reaction-option" onclick="sendReaction(${message.id}, 'like')">👍</span>
                <span class="reaction-option" onclick="sendReaction(${message.id}, 'love')">❤️</span>
                <span class="reaction-option" onclick="sendReaction(${message.id}, 'haha')">😂</span>
                <span class="reaction-option" onclick="sendReaction(${message.id}, 'wow')">😮</span>
                <span class="reaction-option" onclick="sendReaction(${message.id}, 'sad')">😢</span>
                <span class="reaction-option" onclick="sendReaction(${message.id}, 'angry')">😡</span>
            </div>
        </div>
        
        ${isMyMessage ? `
        <div class="rounded-circle bg-success d-flex align-items-center justify-content-center ms-2"
             style="width: 30px; height: 30px; flex-shrink: 0;">
            <i class="fas fa-user text-white"></i>
        </div>
        ` : ''}
    </div>
`;

    // Setup event listeners cho các buttons
    const optionsBtn = messageElement.querySelector('.message-options-btn');
    const reactionBtn = messageElement.querySelector('.reaction-btn');

    if (optionsBtn || reactionBtn) {
        console.log(`✅ Buttons found for messageId: ${message.id}, isMyMessage: ${isMyMessage}, senderId: ${message.senderId}, currentUserId: ${currentUserId}`);
        const messageWrapper = messageElement.querySelector('.message-wrapper');
        if (messageWrapper) {
            messageWrapper.addEventListener('mouseenter', () => {
                if (optionsBtn) optionsBtn.style.opacity = '1';
                if (reactionBtn) reactionBtn.style.opacity = '1';
                console.log(`Mouseenter on message-${message.id}`);
            });
            messageWrapper.addEventListener('mouseleave', () => {
                if (optionsBtn) optionsBtn.style.opacity = '0.7';
                if (reactionBtn) reactionBtn.style.opacity = '0';
                console.log(`Mouseleave on message-${message.id}`);
            });
        } else {
            console.error(`No message wrapper found for messageId: ${message.id}`);
        }
    } else {
        console.error(`❌ No buttons found for messageId: ${message.id}`);
    }

    // QUAN TRỌNG: Thêm tin nhắn vào container messages
    messagesDiv.appendChild(messageElement);

    console.log(`✅ Message displayed: ID=${message.id}, Content="${message.content}", Sender=${message.senderName}, Type=${message.messageType}, Pinned=${message.isPinned}`);
    console.log('=== displayMessage DEBUG END ===');
}

// Function để scroll tới tin nhắn
function scrollToMessage(messageElementId) {
    const targetMessage = document.getElementById(messageElementId);
    if (targetMessage) {
        // Scroll tới tin nhắn
        targetMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Highlight tin nhắn
        targetMessage.classList.add('highlight-message');
        setTimeout(() => {
            targetMessage.classList.remove('highlight-message');
        }, 2000);
    }
}

// Function để cancel reply
function cancelReply() {
    const replyBox = document.getElementById('replyBox');
    if (replyBox) {
        replyBox.style.display = 'none';
        replyBox.dataset.replyToId = '';
        replyBox.dataset.replyToElementId = '';
    }

    const inputBox = document.getElementById('messageInput');
    if (inputBox) {
        inputBox.placeholder = 'Nhập tin nhắn...';
    }
}

// Cập nhật CSS styles cho tin nhắn
function addMessageStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Tin nhắn của mình (bên phải) */
        .message-mine {
            align-self: flex-end;
        }
        
        .message-mine .message-content {
            background-color: #0084ff !important;
            color: white !important;
            border-radius: 18px 18px 4px 18px;
        }
        
        /* Tin nhắn người khác (bên trái) */
        .message-other {
            align-self: flex-start;
        }
        
        .message-other .message-content {
            background-color: #e9ecef !important;
            color: #333 !important;
            border-radius: 18px 18px 18px 4px;
        }
        
        /* Cải thiện hiển thị */
        .message-wrapper {
            display: flex;
            flex-direction: column;
            position: relative;
        }
        
        .message-sender {
            font-size: 0.8rem;
            font-weight: 600;
        }
        
        .message-options-btn {
            background: none;
            border: none;
            cursor: pointer;
            font-size: 16px;
            padding: 2px 4px;
            color: #888;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .message-options-btn:hover {
            background-color: rgba(0,0,0,0.1);
            color: #333;
        }
        
        /* Container tin nhắn */
        #messages {
            display: flex;
            flex-direction: column;
        }
        
        .message-item {
            margin-bottom: 8px;
            width: 100%;
        }
        
        /* Style cho tin nhắn bị xóa bởi người nhận */
        .message-item.deleted-by-receiver .message-content {
            opacity: 0.7;
            border: 1px dashed #ccc;
        }
        
        .message-item.deleted-by-receiver .message-content small {
            font-size: 0.75rem;
            font-style: italic;
        }
        
        /* Đảm bảo tin nhắn bên phải có đủ padding */
        .message-mine .message-wrapper {
            padding-right: 30px;
        }

        .message-other .message-wrapper {
            padding-left: 30px;
        }
        
        /* Reply box styles */
        .reply-box {
            animation: slideDown 0.2s ease-out;
        }
        
        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        /* Highlight message khi click vào reply */
        .highlight-message {
            animation: highlight 2s ease-out;
        }
        
        @keyframes highlight {
            0% {
                background-color: rgba(0, 132, 255, 0.2);
                transform: scale(1.02);
            }
            100% {
                background-color: transparent;
                transform: scale(1);
            }
        }
        
        /* Reply preview trong tin nhắn */
        .reply-preview:hover {
            background: rgba(0,0,0,0.1) !important;
        }
        
        /* Reply preview cho tin nhắn của mình */
        .message-mine .reply-preview {
            background: rgba(255,255,255,0.1) !important;
        }
        
        .message-mine .reply-preview:hover {
            background: rgba(255,255,255,0.2) !important;
        }
        
        .message-mine .reply-preview .small {
            color: rgba(255,255,255,0.9) !important;
        }
    `;
    document.head.appendChild(style);
}

// Function to play voice message
function playVoiceMessage(voiceUrl, button) {
    const audio = new Audio(voiceUrl);
    const icon = button.querySelector('i');
    const voiceMessage = button.closest('.voice-message');
    const progressBar = voiceMessage?.querySelector('.voice-progress');

    if (button.dataset.playing === 'true') {
        audio.pause();
        icon.className = 'fas fa-play';
        button.dataset.playing = 'false';
        return;
    }

    icon.className = 'fas fa-pause';
    button.dataset.playing = 'true';

    if (progressBar) {
        audio.ontimeupdate = function () {
            const progress = (audio.currentTime / audio.duration) * 100;
            progressBar.style.width = progress + '%';
        };
    }

    audio.onended = function () {
        icon.className = 'fas fa-play';
        button.dataset.playing = 'false';
        if (progressBar) {
            progressBar.style.width = '0%';
        }
    };

    audio.play().catch(err => {
        console.error('Error playing audio:', err);
        icon.className = 'fas fa-play';
        button.dataset.playing = 'false';
    });
}

// Export functions nếu cần
window.displayMessage = displayMessage;
window.playVoiceMessage = playVoiceMessage;
window.scrollToMessage = scrollToMessage;
window.cancelReply = cancelReply;

// Function để mở ảnh fullscreen
function openImageFullscreen(imageUrl) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        cursor: pointer;
    `;

    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        object-fit: contain;
    `;

    modal.appendChild(img);
    modal.addEventListener('click', () => modal.remove());
    document.body.appendChild(modal);
}

window.openImageFullscreen = openImageFullscreen;

// Giữ nguyên các hàm cũ
function setupEventListeners() {
    // Thêm styles khi setup
    addMessageStyles();

    document.querySelectorAll('.user-item').forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const userId = this.getAttribute('data-user-id');
            const userName = this.getAttribute('data-user-name');
            selectUser(userId, userName);
        });
    });

    const sendButton = document.getElementById('sendButton');
    const messageInput = document.getElementById('messageInput');

    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }

    if (messageInput) {
        messageInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    const attachButton = document.getElementById('attachButton');
    const fileInput = document.getElementById('fileInput');

    if (attachButton && fileInput) {
        attachButton.addEventListener('click', function () {
            fileInput.click();
        });

        fileInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                uploadAndSendFile(file);
            }
        });
    }

    const voiceButton = document.getElementById('voiceButton');
    if (voiceButton) {
        voiceButton.addEventListener('click', toggleVoiceRecording);
    }

    const cancelRecordingButton = document.getElementById('cancelRecordingButton');
    if (cancelRecordingButton) {
        cancelRecordingButton.addEventListener('click', cancelVoiceRecording);
    }

    const stopRecordingButton = document.getElementById('stopRecordingButton');
    if (stopRecordingButton) {
        stopRecordingButton.addEventListener('click', stopVoiceRecording);
    }

    const audioCallButton = document.getElementById('audioCallButton');
    if (audioCallButton) {
        audioCallButton.addEventListener('click', () => initiateCall('audio'));
    }

    const videoCallButton = document.getElementById('videoCallButton');
    if (videoCallButton) {
        videoCallButton.addEventListener('click', () => initiateCall('video'));
    }

    const acceptCallButton = document.getElementById('acceptCallButton');
    if (acceptCallButton) {
        acceptCallButton.addEventListener('click', acceptCall);
    }

    const rejectCallButton = document.getElementById('rejectCallButton');
    if (rejectCallButton) {
        rejectCallButton.addEventListener('click', rejectCall);
    }

    const endCallButton = document.getElementById('endCallButton');
    if (endCallButton) {
        endCallButton.addEventListener('click', endCall);
    }

    const cancelCallButton = document.getElementById('cancelCallButton');
    if (cancelCallButton) {
        cancelCallButton.addEventListener('click', endCall);
    }

    const muteButton = document.getElementById('muteButton');
    if (muteButton) {
        muteButton.addEventListener('click', toggleMute);
    }

    const cameraButton = document.getElementById('cameraButton');
    if (cameraButton) {
        cameraButton.addEventListener('click', toggleCamera);
    }
}

async function sendMessage() {
    console.log('🚀 Sending message...');
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();

    if (!message) {
        console.warn('⚠️ Message is empty');
        return;
    }

    if (!selectedUserId) {
        console.error('❌ No user selected');
        alert('Vui lòng chọn người để gửi tin nhắn!');
        return;
    }

    if (!isSignalRInitialized || !connection || connection.state !== 'Connected') {
        console.error('❌ SignalR not connected. State:', connection ? connection.state : 'null');
        alert('Kết nối SignalR không sẵn sàng. Vui lòng thử lại.');
        return;
    }

    try {
        // Kiểm tra xem có đang reply không
        const replyBox = document.getElementById('replyBox');
        let replyToMessageId = null;

        if (replyBox && replyBox.style.display !== 'none') {
            replyToMessageId = parseInt(replyBox.dataset.replyToId);
        }

        console.log('📤 Sending message:', {
            to: selectedUserId,
            content: message,
            replyTo: replyToMessageId
        });

        // Gửi tin nhắn với replyToMessageId nếu có
        if (replyToMessageId) {
            console.log('🔄 Invoking SendReplyMessage...');
            await connection.invoke("SendReplyMessage", selectedUserId, message, "text", replyToMessageId);
            console.log('✅ SendReplyMessage invoked successfully');
        } else {
            console.log('📨 Invoking SendMessage...');
            await connection.invoke("SendMessage", selectedUserId, message, "text");
            console.log('✅ SendMessage invoked successfully');
        }

        messageInput.value = '';
        cancelReply(); // Clear reply box sau khi gửi

        console.log('✅ Message sent successfully');

        // Auto scroll xuống dưới sau khi gửi tin nhắn
        setTimeout(() => {
            const messages = document.getElementById('messages');
            if (messages && messages.lastElementChild) {
                messages.lastElementChild.scrollIntoView({
                    behavior: 'smooth',
                    block: 'end'
                });
            }
        }, 100);

    } catch (err) {
        console.error('❌ Send message error:', err);
        console.error('Error details:', {
            name: err.name,
            message: err.message,
            stack: err.stack
        });
        alert('Không thể gửi tin nhắn. Vui lòng thử lại.');
    }
}

function uploadAndSendFile(file) {
    if (!selectedUserId) {
        alert('Vui lòng chọn người để gửi file!');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('receiverId', selectedUserId);

    const uploadProgress = document.getElementById('uploadProgress');
    if (uploadProgress) {
        uploadProgress.style.display = 'block';
    }

    fetch('/FileUpload/UploadChatMedia', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (uploadProgress) {
                uploadProgress.style.display = 'none';
            }

            if (data.success) {
                if (isSignalRInitialized && connection && connection.state === 'Connected') {
                    connection.invoke("SendMediaMessage", selectedUserId, data.fileUrl, data.mediaType, data.fileName, data.fileSize)
                        .then(() => {
                            console.log('✅ Media message sent successfully');
                            const fileInput = document.getElementById('fileInput');
                            if (fileInput) {
                                fileInput.value = '';
                            }
                        })
                        .catch(err => {
                            console.error('❌ Send media error:', err);
                        });
                } else {
                    console.error('❌ SignalR not connected for sending media message. State:', connection ? connection.state : 'null');
                    alert('Kết nối SignalR không sẵn sàng. Vui lòng thử lại.');
                }
            } else {
                alert('Lỗi upload: ' + data.error);
            }
        })
        .catch(err => {
            if (uploadProgress) {
                uploadProgress.style.display = 'none';
            }
            console.error('❌ Upload error:', err);
            alert('Lỗi upload file');
        });
}

// ===== REACTION FUNCTIONS =====
// Hiển thị reactions
function displayReactions(reactions) {
    if (!reactions || reactions.length === 0) return '';

    // Lấy messageId từ reaction đầu tiên
    const messageId = reactions[0]?.messageId;

    // Group reactions by type
    const grouped = reactions.reduce((acc, r) => {
        if (!acc[r.reactionType]) {
            acc[r.reactionType] = { emoji: getReactionEmoji(r.reactionType), count: 0, users: [] };
        }
        acc[r.reactionType].count++;
        acc[r.reactionType].users.push(r.userName || 'Unknown');
        return acc;
    }, {});

    return `<div class="reactions-display">` +
        Object.entries(grouped).map(([type, data]) => `
            <div class="reaction-badge" 
                 title="${data.users.join(', ')}"
                 ${messageId ? `onclick="sendReaction(${messageId}, '${type}')"` : ''}>
                <span class="reaction-emoji">${data.emoji}</span>
                <span class="reaction-count">${data.count > 1 ? data.count : ''}</span>
            </div>
        `).join('') +
        `</div>`;
}

// Display reactions với messageId
function displayReactionsWithMessageId(reactions, messageId) {
    if (!reactions || reactions.length === 0) return '';

    // Filter duplicate reactions (giữ lại reaction cuối cùng của mỗi user)
    const uniqueReactions = [];
    const userReactionMap = new Map();

    reactions.forEach(r => {
        const key = `${r.userId}-${r.reactionType}`;
        userReactionMap.set(key, r);
    });

    userReactionMap.forEach(r => uniqueReactions.push(r));

    // Group reactions by type
    const grouped = uniqueReactions.reduce((acc, r) => {
        if (!acc[r.reactionType]) {
            acc[r.reactionType] = {
                emoji: getReactionEmoji(r.reactionType),
                count: 0,
                users: [],
                hasCurrentUser: false
            };
        }
        acc[r.reactionType].count++;
        acc[r.reactionType].users.push(r.userName || 'Unknown');

        // Check if current user reacted
        if (r.userId === currentUserId) {
            acc[r.reactionType].hasCurrentUser = true;
        }

        return acc;
    }, {});

    return `<div class="reactions-display">` +
        Object.entries(grouped).map(([type, data]) => `
            <div class="reaction-badge ${data.hasCurrentUser ? 'user-reacted' : ''}" 
                 title="${data.users.join(', ')}"
                 onclick="sendReaction(${messageId}, '${type}')">
                <span class="reaction-emoji">${data.emoji}</span>
                <span class="reaction-count">${data.count > 1 ? data.count : ''}</span>
            </div>
        `).join('') +
        `</div>`;
}

// Toggle reaction picker
function toggleReactionPicker(event, messageId) {
    event.stopPropagation();
    const picker = document.getElementById(`reaction-picker-${messageId}`);

    if (!picker) {
        console.error(`Reaction picker not found for message ${messageId}`);
        return;
    }

    // Đóng tất cả picker khác
    document.querySelectorAll('.reaction-picker').forEach(p => {
        if (p !== picker) p.style.display = 'none';
    });

    // Toggle picker hiện tại
    if (picker.style.display === 'none' || !picker.style.display) {
        picker.style.display = 'flex';

        // Position picker ngay trên button
        const button = event.currentTarget;
        const buttonRect = button.getBoundingClientRect();
        const pickerRect = picker.getBoundingClientRect();

        // Tính toán vị trí để picker nằm chính giữa phía trên button
        const left = buttonRect.left + (buttonRect.width / 2) - (pickerRect.width / 2);
        const top = buttonRect.top - pickerRect.height - 5; // 5px gap

        picker.style.position = 'fixed';
        picker.style.left = `${left}px`;
        picker.style.top = `${top}px`;
    } else {
        picker.style.display = 'none';
    }
}

// Send reaction
async function sendReaction(messageId, reactionType) {
    try {
        if (!messageId) {
            console.error('Invalid messageId for reaction');
            return;
        }

        if (connection && connection.state === 'Connected') {
            await connection.invoke("SendReaction", messageId, reactionType);
            console.log(`✅ Reaction sent/toggled: ${reactionType} for message ${messageId}`);

            // Đóng picker
            const picker = document.getElementById(`reaction-picker-${messageId}`);
            if (picker) picker.style.display = 'none';
        } else {
            console.error('SignalR not connected');
            alert('Kết nối không sẵn sàng. Vui lòng thử lại.');
        }
    } catch (err) {
        console.error('Error sending reaction:', err);
        // Chỉ hiển thị notification nếu KHÔNG phải lỗi do reaction trùng
        if (!err.toString().includes('reaction')) {
            showNotification('Không thể gửi reaction', 'error');
        }
    }
}

// Helper function
function getReactionEmoji(type) {
    const emojis = {
        'like': '👍',
        'love': '❤️',
        'haha': '😂',
        'wow': '😮',
        'sad': '😢',
        'angry': '😡'
    };
    return emojis[type] || '👍';
}

// Đóng picker khi click ngoài
document.addEventListener('click', (event) => {
    if (!event.target.closest('.reaction-btn') && !event.target.closest('.reaction-picker')) {
        document.querySelectorAll('.reaction-picker').forEach(p => {
            p.style.display = 'none';
        });
    }
});

// Export functions
window.displayReactions = displayReactions;
window.displayReactionsWithMessageId = displayReactionsWithMessageId;
window.toggleReactionPicker = toggleReactionPicker;
window.sendReaction = sendReaction;
window.getReactionEmoji = getReactionEmoji;