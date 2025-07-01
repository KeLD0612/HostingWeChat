function updateConnectionStatus(status) {
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
        statusElement.className = `connection-status ${status}`;
        switch (status) {
            case 'connected':
                statusElement.innerHTML = '<i class="fas fa-wifi"></i> Connected';
                break;
            case 'connecting':
                statusElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
                break;
            case 'disconnected':
                statusElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Disconnected';
                break;
        }
    } else {
        // console.log('Connection status element not found, skipping UI update.');
    }
}



function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function loadChatHistory(userId) {
    console.log('📚 Loading chat history for userId:', userId);

    if (!userId) {
        console.error('❌ Invalid userId for chat history');
        return;
    }

    const encodedUserId = encodeURIComponent(userId);
    const url = `/Chat/GetMessages?userId=${encodedUserId}`;
    console.log('Fetching from URL:', url);

    fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'same-origin' // Quan trọng cho authentication
    })
        .then(async response => {
            console.log('Response status:', response.status);

            const data = await response.json();
            console.log('Response data:', data);

            // Check for error response
            if (data.error || data.success === false) {
                throw new Error(data.error || 'Unknown error');
            }

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            return data;
        })
        .then(messages => {
            console.log('📚 Messages to display:', messages);

            // Debug xem có reply info không
            messages.forEach(msg => {
                if (msg.repliedMessageId) {
                    console.log('Found reply message:', msg);
                }
                // Debug xem có pinned info không
                if (msg.isPinned) {
                    console.log('📌 Found pinned message:', msg);
                }
                // Debug xem có reactions không
                if (msg.reactions && msg.reactions.length > 0) {
                    console.log('😊 Found message with reactions:', msg);
                }
            });

            if (!Array.isArray(messages)) {
                console.error('Messages is not an array:', messages);
                throw new Error('Invalid response format');
            }

            if (messages.length > 0) {
                const messagesDiv = document.getElementById('messages');
                if (messagesDiv) {
                    messagesDiv.innerHTML = ''; // Clear old messages
                }

                messages.forEach((msg, index) => {
                    try {
                        displayMessage({
                            id: msg.id,
                            senderId: msg.senderId,
                            senderName: msg.senderName,
                            content: msg.content,
                            messageType: msg.messageType || 'text',
                            timestamp: msg.timestamp,
                            isSender: msg.isSender,
                            isRecalled: msg.isRecalled,
                            isDeletedByReceiver: msg.isDeletedByReceiver,
                            repliedMessageId: msg.repliedMessageId,
                            repliedMessage: msg.repliedMessage,
                            isPinned: msg.isPinned,
                            reactions: msg.reactions  // THÊM DÒNG NÀY ĐỂ LOAD REACTIONS
                        });
                    } catch (err) {
                        console.error(`Error displaying message ${index}:`, err, msg);
                    }
                });

                scrollToBottom();
            } else {
                console.log('📭 No messages found');
            }
        })
        .catch(err => {
            console.error('❌ Error loading chat history:', err);
            showNotification('Không thể tải lịch sử chat. Vui lòng thử lại sau.', 'error');
        });
}
function scrollToBottom() {
    const messagesContainer = document.getElementById('messagesContainer');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Sticker utilities
function isValidStickerUrl(url) {
    const validExtensions = ['.gif', '.png', '.jpg', '.jpeg', '.webp'];
    const validDomains = ['tenor.com', 'giphy.com', 'media.tenor.com'];

    try {
        const urlObj = new URL(url);
        const hasValidExtension = validExtensions.some(ext => url.toLowerCase().includes(ext));
        const hasValidDomain = validDomains.some(domain => urlObj.hostname.includes(domain));

        return hasValidExtension || hasValidDomain;
    } catch {
        return false;
    }
}

function getStickerPreview(url) {
    // Generate thumbnail for sticker preview
    return url.replace(/\.gif$/, '.jpg').replace(/\/c\//g, '/ac/');
}

window.isValidStickerUrl = isValidStickerUrl;
window.getStickerPreview = getStickerPreview;
