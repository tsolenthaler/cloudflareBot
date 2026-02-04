/**
 * Main Application Logic
 * Handles UI interactions and coordinates between UI and ChatBot
 */

class CloudflareHelperApp {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.userInput = document.getElementById('userInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.tokenModal = document.getElementById('tokenModal');
        this.loadingOverlay = document.getElementById('loadingOverlay');

        this.initializeEventListeners();
        this.updateTokenStatus();
    }

    /**
     * Initialize all event listeners
     */
    initializeEventListeners() {
        // Send message on button click
        this.sendBtn.addEventListener('click', () => this.handleSendMessage());

        // Send message on Enter key
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSendMessage();
            }
        });

        // Clear chat button
        document.getElementById('clearChatBtn').addEventListener('click', () => {
            this.clearChat();
        });

        // Token configuration button
        document.getElementById('tokenBtn').addEventListener('click', () => {
            this.openTokenModal();
        });

        // Modal close button
        document.querySelector('.modal-close').addEventListener('click', () => {
            this.closeTokenModal();
        });

        // Close modal on outside click
        this.tokenModal.addEventListener('click', (e) => {
            if (e.target === this.tokenModal) {
                this.closeTokenModal();
            }
        });

        // Save token button
        document.getElementById('saveTokenBtn').addEventListener('click', () => {
            this.saveToken();
        });

        // Test token button
        document.getElementById('testTokenBtn').addEventListener('click', () => {
            this.testToken();
        });

        // Delete token button
        document.getElementById('deleteTokenBtn').addEventListener('click', () => {
            this.deleteToken();
        });

        // Toggle token visibility
        document.getElementById('toggleTokenVisibility').addEventListener('click', () => {
            this.toggleTokenVisibility();
        });

        // Quick action buttons
        document.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const command = e.target.getAttribute('data-command');
                this.userInput.value = command;
                this.handleSendMessage();
            });
        });

        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.tokenModal.classList.contains('active')) {
                this.closeTokenModal();
            }
        });
    }

    /**
     * Handle sending a message
     */
    async handleSendMessage() {
        const message = this.userInput.value.trim();

        if (!message) {
            return;
        }

        // Add user message to chat
        this.addMessage(message, 'user');

        // Clear input
        this.userInput.value = '';

        // Show loading
        this.showLoading();

        try {
            // Process message with chatbot
            const response = await chatBot.processMessage(message);

            // Hide loading
            this.hideLoading();

            // Add bot response to chat
            this.addMessage(response.message, 'bot');

            // Handle special actions
            if (response.action === 'configure_token') {
                setTimeout(() => this.openTokenModal(), 500);
            }
        } catch (error) {
            this.hideLoading();
            this.addMessage(`❌ Ein Fehler ist aufgetreten: ${error.message}`, 'bot');
            console.error('Error processing message:', error);
        }
    }

    /**
     * Add a message to the chat
     */
    addMessage(text, sender = 'bot') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = sender === 'user' ? '👤' : '🤖';

        const content = document.createElement('div');
        content.className = 'message-content';

        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        messageText.innerHTML = text;

        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = this.getCurrentTime();

        content.appendChild(messageText);
        content.appendChild(messageTime);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);

        this.chatMessages.appendChild(messageDiv);

        // Scroll to bottom
        this.scrollToBottom();
    }

    /**
     * Get current time formatted
     */
    getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }

    /**
     * Scroll chat to bottom
     */
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    /**
     * Clear chat messages
     */
    clearChat() {
        // Keep only the welcome message
        const welcomeMessage = this.chatMessages.querySelector('.message.bot-message');
        this.chatMessages.innerHTML = '';
        if (welcomeMessage) {
            this.chatMessages.appendChild(welcomeMessage);
        }
        
        this.addMessage('✅ Chat wurde geleert.', 'bot');
    }

    /**
     * Open token configuration modal
     */
    openTokenModal() {
        this.tokenModal.classList.add('active');
        
        // Load existing token if available
        const existingToken = cloudflareAPI.getStoredToken();
        if (existingToken) {
            document.getElementById('apiToken').value = existingToken;
        }

        // Clear messages
        document.getElementById('tokenError').style.display = 'none';
        document.getElementById('tokenSuccess').style.display = 'none';
    }

    /**
     * Close token configuration modal
     */
    closeTokenModal() {
        this.tokenModal.classList.remove('active');
        
        // Clear input if not saved
        if (!cloudflareAPI.hasToken()) {
            document.getElementById('apiToken').value = '';
        }
    }

    /**
     * Save API token
     */
    async saveToken() {
        const tokenInput = document.getElementById('apiToken');
        const token = tokenInput.value.trim();
        const errorDiv = document.getElementById('tokenError');
        const successDiv = document.getElementById('tokenSuccess');

        // Hide previous messages
        errorDiv.style.display = 'none';
        successDiv.style.display = 'none';

        if (!token) {
            errorDiv.textContent = 'Bitte gib einen API-Token ein.';
            errorDiv.style.display = 'block';
            return;
        }

        // Save token
        cloudflareAPI.saveToken(token);

        // Verify token
        this.showLoading();
        const verification = await cloudflareAPI.verifyToken();
        this.hideLoading();

        if (verification.success) {
            successDiv.textContent = '✅ Token erfolgreich gespeichert und verifiziert!';
            successDiv.style.display = 'block';
            
            this.updateTokenStatus();
            
            // Close modal after short delay
            setTimeout(() => {
                this.closeTokenModal();
                this.addMessage('✅ API-Token wurde erfolgreich konfiguriert. Du kannst jetzt Befehle ausführen!', 'bot');
            }, 1500);
        } else {
            errorDiv.textContent = `❌ Token-Verifizierung fehlgeschlagen: ${verification.error}`;
            errorDiv.style.display = 'block';
            
            // Remove invalid token
            cloudflareAPI.deleteToken();
            this.updateTokenStatus();
        }
    }

    /**
     * Test API token
     */
    async testToken() {
        const tokenInput = document.getElementById('apiToken');
        const token = tokenInput.value.trim();
        const errorDiv = document.getElementById('tokenError');
        const successDiv = document.getElementById('tokenSuccess');

        // Hide previous messages
        errorDiv.style.display = 'none';
        successDiv.style.display = 'none';

        if (!token) {
            errorDiv.textContent = 'Bitte gib einen API-Token ein.';
            errorDiv.style.display = 'block';
            return;
        }

        // Temporarily set token for testing
        const originalToken = cloudflareAPI.token;
        cloudflareAPI.token = token;

        this.showLoading();
        const verification = await cloudflareAPI.verifyToken();
        this.hideLoading();

        // Restore original token
        cloudflareAPI.token = originalToken;

        if (verification.success) {
            const tokenData = verification.data;
            successDiv.innerHTML = `
✅ <strong>Token ist gültig!</strong><br>
Status: ${tokenData.status}<br>
${tokenData.expires_on ? `Läuft ab: ${new Date(tokenData.expires_on).toLocaleDateString('de-DE')}` : 'Kein Ablaufdatum'}
            `;
            successDiv.style.display = 'block';
        } else {
            errorDiv.textContent = `❌ Token-Verifizierung fehlgeschlagen: ${verification.error}`;
            errorDiv.style.display = 'block';
        }
    }

    /**
     * Delete API token
     */
    deleteToken() {
        if (!confirm('Möchtest du wirklich den gespeicherten API-Token löschen?')) {
            return;
        }

        cloudflareAPI.deleteToken();
        document.getElementById('apiToken').value = '';
        
        const successDiv = document.getElementById('tokenSuccess');
        successDiv.textContent = '✅ Token wurde gelöscht.';
        successDiv.style.display = 'block';

        this.updateTokenStatus();

        // Close modal and notify
        setTimeout(() => {
            this.closeTokenModal();
            this.addMessage('⚠️ API-Token wurde gelöscht. Bitte konfiguriere einen neuen Token, um fortzufahren.', 'bot');
        }, 1000);
    }

    /**
     * Toggle token visibility in input
     */
    toggleTokenVisibility() {
        const tokenInput = document.getElementById('apiToken');
        tokenInput.type = tokenInput.type === 'password' ? 'text' : 'password';
    }

    /**
     * Update token status indicator
     */
    updateTokenStatus() {
        const statusSpan = document.getElementById('tokenStatus');
        
        if (cloudflareAPI.hasToken()) {
            statusSpan.textContent = '🔑 Token konfiguriert';
        } else {
            statusSpan.textContent = '🔑 Token konfigurieren';
        }
    }

    /**
     * Show loading overlay
     */
    showLoading() {
        this.loadingOverlay.style.display = 'flex';
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new CloudflareHelperApp();
    console.log('CloudflareHelper App initialized');
    
    // Make app globally accessible for debugging
    window.cloudflareHelperApp = app;
});
