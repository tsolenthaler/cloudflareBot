/**
 * Main Application Logic
 * Handles UI interactions and coordinates between UI and ChatBot
 */

class CloudflareHelperApp {
    constructor() {
        // Initialize API and ChatBot
        this.api = window.cloudflareAPI || new CloudflareAPI();
        this.chatBot = window.chatBot || new ChatBot(this.api);
        
        this.chatMessages = document.getElementById('chatMessages');
        this.userInput = document.getElementById('userInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.tokenModal = document.getElementById('tokenModal');
        this.loadingOverlay = document.getElementById('loadingOverlay');

        // Check if all required elements exist
        if (!this.chatMessages || !this.userInput || !this.sendBtn || !this.tokenModal || !this.loadingOverlay) {
            console.error('Required DOM elements not found');
            return;
        }

        this.initializeEventListeners();
        this.updateTokenStatus();
    }

    /**
     * Initialize all event listeners
     */
    initializeEventListeners() {
        // Send message on button click
        if (this.sendBtn) {
            this.sendBtn.addEventListener('click', () => this.handleSendMessage());
        }

        // Send message on Enter key
        if (this.userInput) {
            this.userInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSendMessage();
                }
            });
        }

        // Clear chat button
        const clearChatBtn = document.getElementById('clearChatBtn');
        if (clearChatBtn) {
            clearChatBtn.addEventListener('click', () => {
                this.clearChat();
            });
        }

        // Token configuration button
        const tokenBtn = document.getElementById('tokenBtn');
        if (tokenBtn) {
            tokenBtn.addEventListener('click', () => {
                this.openTokenModal();
            });
        }

        // Modal close button
        const modalClose = document.querySelector('.modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', () => {
                this.closeTokenModal();
            });
        }

        // Close modal on outside click
        if (this.tokenModal) {
            this.tokenModal.addEventListener('click', (e) => {
                if (e.target === this.tokenModal) {
                    this.closeTokenModal();
                }
            });
        }

        // Save token button
        const saveTokenBtn = document.getElementById('saveTokenBtn');
        if (saveTokenBtn) {
            saveTokenBtn.addEventListener('click', () => {
                this.saveToken();
            });
        }

        // Test token button
        const testTokenBtn = document.getElementById('testTokenBtn');
        if (testTokenBtn) {
            testTokenBtn.addEventListener('click', () => {
                this.testToken();
            });
        }

        // Delete token button
        const deleteTokenBtn = document.getElementById('deleteTokenBtn');
        if (deleteTokenBtn) {
            deleteTokenBtn.addEventListener('click', () => {
                this.deleteToken();
            });
        }

        // Toggle token visibility
        const toggleTokenVisibility = document.getElementById('toggleTokenVisibility');
        if (toggleTokenVisibility) {
            toggleTokenVisibility.addEventListener('click', () => {
                this.toggleTokenVisibility();
            });
        }

        // CORS Proxy toggle
        const enableCorsProxy = document.getElementById('enableCorsProxy');
        if (enableCorsProxy) {
            enableCorsProxy.checked = this.api.isCorsProxyEnabled();
            enableCorsProxy.addEventListener('change', (e) => {
                if (e.target.checked) {
                    if (confirm('⚠️ WARNUNG: Der CORS-Proxy leitet deine API-Anfragen über einen Drittanbieter-Server.\n\nDein API-Token könnte potenziell vom Proxy-Betreiber eingesehen werden.\n\nNur für Tests verwenden!\n\nMöchtest du fortfahren?')) {
                        this.api.enableCorsProxy();
                        this.addMessage('⚠️ CORS-Proxy wurde aktiviert. Verwende dies nur für Tests!', 'bot');
                    } else {
                        e.target.checked = false;
                    }
                } else {
                    this.api.disableCorsProxy();
                    this.addMessage('✅ CORS-Proxy wurde deaktiviert.', 'bot');
                }
            });
        }

        // Quick action buttons
        document.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const command = e.target.getAttribute('data-command');
                if (this.userInput) {
                    this.userInput.value = command;
                    this.handleSendMessage();
                }
            });
        });

        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.tokenModal && this.tokenModal.classList.contains('active')) {
                    this.closeTokenModal();
                }
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
            const response = await this.chatBot.processMessage(message);

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
        if (!this.chatMessages) return;

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
        if (this.chatMessages) {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
    }

    /**
     * Clear chat messages
     */
    clearChat() {
        if (!this.chatMessages) return;

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
        if (!this.tokenModal) return;

        this.tokenModal.classList.add('active');
        
        // Load existing token if available
        const existingToken = this.api.getStoredToken();
        const apiTokenInput = document.getElementById('apiToken');
        if (existingToken && apiTokenInput) {
            apiTokenInput.value = existingToken;
        }

        // Clear messages
        const tokenError = document.getElementById('tokenError');
        const tokenSuccess = document.getElementById('tokenSuccess');
        if (tokenError) tokenError.style.display = 'none';
        if (tokenSuccess) tokenSuccess.style.display = 'none';
    }

    /**
     * Close token configuration modal
     */
    closeTokenModal() {
        if (!this.tokenModal) return;

        this.tokenModal.classList.remove('active');
        
        // Clear input if not saved
        if (!this.api.hasToken()) {
            const apiTokenInput = document.getElementById('apiToken');
            if (apiTokenInput) {
                apiTokenInput.value = '';
            }
        }
    }

    /**
     * Save API token
     */
    async saveToken() {
        const tokenInput = document.getElementById('apiToken');
        const errorDiv = document.getElementById('tokenError');
        const successDiv = document.getElementById('tokenSuccess');

        if (!tokenInput || !errorDiv || !successDiv) return;

        const token = tokenInput.value.trim();

        // Hide previous messages
        errorDiv.style.display = 'none';
        successDiv.style.display = 'none';

        if (!token) {
            errorDiv.textContent = 'Bitte gib einen API-Token ein.';
            errorDiv.style.display = 'block';
            return;
        }

        // Save token
        this.api.saveToken(token);

        // Verify token
        this.showLoading();
        const verification = await this.api.verifyToken();
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
            this.api.deleteToken();
            this.updateTokenStatus();
        }
    }

    /**
     * Test API token
     */
    async testToken() {
        const tokenInput = document.getElementById('apiToken');
        const errorDiv = document.getElementById('tokenError');
        const successDiv = document.getElementById('tokenSuccess');

        if (!tokenInput || !errorDiv || !successDiv) return;

        const token = tokenInput.value.trim();

        // Hide previous messages
        errorDiv.style.display = 'none';
        successDiv.style.display = 'none';

        if (!token) {
            errorDiv.textContent = 'Bitte gib einen API-Token ein.';
            errorDiv.style.display = 'block';
            return;
        }

        // Temporarily set token for testing
        const originalToken = this.api.token;
        this.api.token = token;

        this.showLoading();
        const verification = await this.api.verifyToken();
        this.hideLoading();

        // Restore original token
        this.api.token = originalToken;

        if (verification.success) {
            const tokenData = verification.data;
            
            // Also test account access
            this.api.token = token; // Set temporarily to test with this token
            this.showLoading();
            let accountInfo = '';
            let accountsData = [];
            try {
                accountsData = await this.api.getAccounts();
                if (accountsData.length > 0) {
                    accountInfo = `<br><strong>Accounts:</strong> ✅ ${accountsData.length} Account(s) gefunden<br>`;
                    accountInfo += accountsData.map(acc => `  • ${acc.name} (${acc.id})`).join('<br>');
                } else {
                    accountInfo = `<br><strong>Accounts:</strong> ⚠️ Keine Accounts gefunden (leeres Array)`;
                }
            } catch (e) {
                accountInfo = `<br><strong>Accounts:</strong> ❌ Fehler: ${e.message}`;
            }
            this.api.token = originalToken; // Restore original
            this.hideLoading();
            
            successDiv.innerHTML = `
✅ <strong>Token ist gültig!</strong><br>
Status: ${tokenData.status}<br>
${tokenData.expires_on ? `Läuft ab: ${new Date(tokenData.expires_on).toLocaleDateString('de-DE')}` : 'Kein Ablaufdatum'}
${accountInfo}
            `;
            successDiv.style.display = 'block';
        } else {
            errorDiv.innerHTML = `
❌ <strong>Token-Verifizierung fehlgeschlagen:</strong><br>
${verification.error}<br><br>
<strong>Mögliche Ursachen:</strong><ul style="text-align: left;">
<li>Token ist ungültig oder abgelaufen</li>
<li>Token wurde widerrufen</li>
<li>Netzwerkfehler</li>
</ul>
            `;
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

        this.api.deleteToken();
        
        const apiTokenInput = document.getElementById('apiToken');
        if (apiTokenInput) {
            apiTokenInput.value = '';
        }
        
        const successDiv = document.getElementById('tokenSuccess');
        if (successDiv) {
            successDiv.textContent = '✅ Token wurde gelöscht.';
            successDiv.style.display = 'block';
        }

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
        if (tokenInput) {
            tokenInput.type = tokenInput.type === 'password' ? 'text' : 'password';
        }
    }

    /**
     * Update token status indicator
     */
    updateTokenStatus() {
        const statusSpan = document.getElementById('tokenStatus');
        
        if (statusSpan) {
            if (this.api.hasToken()) {
                statusSpan.textContent = '🔑 Token konfiguriert';
            } else {
                statusSpan.textContent = '🔑 Token konfigurieren';
            }
        }
    }

    /**
     * Show loading overlay
     */
    showLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'flex';
        }
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'none';
        }
    }

}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new CloudflareHelperApp();
    console.log('CloudflareHelper App initialized');
    
    // Make app globally accessible for debugging
    window.cloudflareHelperApp = app;
});
