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

        // Check if all required elements exist
        if (!this.chatMessages || !this.userInput || !this.sendBtn || !this.tokenModal || !this.loadingOverlay) {
            console.error('Required DOM elements not found');
            return;
        }

        this.initializeEventListeners();
        this.updateTokenStatus();
        this.updateAIStatus();
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

        // AI Configuration button
        const aiConfigBtn = document.getElementById('aiConfigBtn');
        if (aiConfigBtn) {
            aiConfigBtn.addEventListener('click', () => {
                this.openAIConfigModal();
            });
        }

        // AI Modal close button
        const modalCloseAI = document.querySelector('.modal-close-ai');
        if (modalCloseAI) {
            modalCloseAI.addEventListener('click', () => {
                this.closeAIConfigModal();
            });
        }

        // Close AI modal on outside click
        const aiConfigModal = document.getElementById('aiConfigModal');
        if (aiConfigModal) {
            aiConfigModal.addEventListener('click', (e) => {
                if (e.target === aiConfigModal) {
                    this.closeAIConfigModal();
                }
            });
        }

        // Save AI config button
        const saveAIConfigBtn = document.getElementById('saveAIConfigBtn');
        if (saveAIConfigBtn) {
            saveAIConfigBtn.addEventListener('click', () => {
                this.saveAIConfig();
            });
        }

        // Setup AI Gateway button
        const setupAIGatewayBtn = document.getElementById('setupAIGatewayBtn');
        if (setupAIGatewayBtn) {
            setupAIGatewayBtn.addEventListener('click', () => {
                this.setupAIGateway();
            });
        }

        // Test AI button
        const testAIBtn = document.getElementById('testAIBtn');
        if (testAIBtn) {
            testAIBtn.addEventListener('click', () => {
                this.testAI();
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
            enableCorsProxy.checked = cloudflareAPI.isCorsProxyEnabled();
            enableCorsProxy.addEventListener('change', (e) => {
                if (e.target.checked) {
                    if (confirm('⚠️ WARNUNG: Der CORS-Proxy leitet deine API-Anfragen über einen Drittanbieter-Server.\n\nDein API-Token könnte potenziell vom Proxy-Betreiber eingesehen werden.\n\nNur für Tests verwenden!\n\nMöchtest du fortfahren?')) {
                        cloudflareAPI.enableCorsProxy();
                        this.addMessage('⚠️ CORS-Proxy wurde aktiviert. Verwende dies nur für Tests!', 'bot');
                    } else {
                        e.target.checked = false;
                    }
                } else {
                    cloudflareAPI.disableCorsProxy();
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
                const aiModal = document.getElementById('aiConfigModal');
                if (aiModal && aiModal.classList.contains('active')) {
                    this.closeAIConfigModal();
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
        const existingToken = cloudflareAPI.getStoredToken();
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
        if (!cloudflareAPI.hasToken()) {
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
            if (cloudflareAPI.hasToken()) {
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

    // ========================================
    // AI Configuration Methods
    // ========================================

    /**
     * Open AI configuration modal
     */
    openAIConfigModal() {
        const aiConfigModal = document.getElementById('aiConfigModal');
        if (!aiConfigModal) return;

        if (!cloudflareAPI.hasToken()) {
            this.addMessage('⚠️ Bitte konfiguriere zuerst deinen API-Token, bevor du Workers AI einrichtest.', 'bot');
            this.openTokenModal();
            return;
        }

        aiConfigModal.classList.add('active');
        
        // Load existing AI config
        const config = cloudflareAPI.getAIConfig();
        
        const aiEnabled = document.getElementById('aiEnabled');
        const aiModel = document.getElementById('aiModel');
        const aiGatewayName = document.getElementById('aiGatewayName');
        
        if (aiEnabled) aiEnabled.checked = config.enabled || false;
        if (aiModel) aiModel.value = config.model || '@cf/meta/llama-3.1-8b-instruct';
        if (aiGatewayName) aiGatewayName.value = config.gatewayName || '';

        // Show current config if exists
        if (config.enabled) {
            this.displayAIConfig(config);
        }

        // Clear messages
        const aiError = document.getElementById('aiError');
        const aiSuccess = document.getElementById('aiSuccess');
        if (aiError) aiError.style.display = 'none';
        if (aiSuccess) aiSuccess.style.display = 'none';
    }

    /**
     * Close AI configuration modal
     */
    closeAIConfigModal() {
        const aiConfigModal = document.getElementById('aiConfigModal');
        if (!aiConfigModal) return;

        aiConfigModal.classList.remove('active');
    }

    /**
     * Save AI configuration
     */
    async saveAIConfig() {
        const aiEnabled = document.getElementById('aiEnabled');
        const aiModel = document.getElementById('aiModel');
        const aiGatewayName = document.getElementById('aiGatewayName');
        const aiError = document.getElementById('aiError');
        const aiSuccess = document.getElementById('aiSuccess');

        if (!aiEnabled || !aiModel || !aiError || !aiSuccess) return;

        // Hide previous messages
        aiError.style.display = 'none';
        aiSuccess.style.display = 'none';

        const config = {
            enabled: aiEnabled.checked,
            model: aiModel.value,
            gatewayName: aiGatewayName ? aiGatewayName.value.trim() : null
        };

        try {
            cloudflareAPI.saveAIConfig(config);
            
            aiSuccess.textContent = '✅ AI-Konfiguration erfolgreich gespeichert!';
            aiSuccess.style.display = 'block';
            
            this.updateAIStatus();
            this.displayAIConfig(config);
            
            setTimeout(() => {
                this.closeAIConfigModal();
                if (config.enabled) {
                    this.addMessage('✅ Workers AI wurde aktiviert!', 'bot');
                } else {
                    this.addMessage('ℹ️ Workers AI wurde deaktiviert.', 'bot');
                }
            }, 1500);
        } catch (error) {
            aiError.textContent = `❌ Fehler beim Speichern: ${error.message}`;
            aiError.style.display = 'block';
        }
    }

    /**
     * Setup AI Gateway
     */
    async setupAIGateway() {
        const aiGatewayName = document.getElementById('aiGatewayName');
        const aiError = document.getElementById('aiError');
        const aiSuccess = document.getElementById('aiSuccess');

        if (!aiError || !aiSuccess) return;

        // Hide previous messages
        aiError.style.display = 'none';
        aiSuccess.style.display = 'none';

        if (!cloudflareAPI.hasToken()) {
            aiError.textContent = '❌ Bitte konfiguriere zuerst deinen API-Token.';
            aiError.style.display = 'block';
            return;
        }

        const gatewayName = aiGatewayName ? aiGatewayName.value.trim() || 'cloudflare-helper-gateway' : 'cloudflare-helper-gateway';

        this.showLoading();
        
        try {
            const gateway = await cloudflareAPI.setupAIGateway(gatewayName);
            this.hideLoading();
            
            // Save gateway info
            cloudflareAPI.saveAIConfig({
                gatewayId: gateway.id,
                gatewayName: gateway.name
            });
            
            aiSuccess.innerHTML = `
✅ <strong>AI Gateway erfolgreich eingerichtet!</strong><br>
Name: ${gateway.name}<br>
ID: ${gateway.id}
            `;
            aiSuccess.style.display = 'block';
            
            // Update gateway name field
            if (aiGatewayName) {
                aiGatewayName.value = gateway.name;
            }
        } catch (error) {
            this.hideLoading();
            aiError.textContent = `❌ Gateway-Setup fehlgeschlagen: ${error.message}`;
            aiError.style.display = 'block';
        }
    }

    /**
     * Test AI configuration
     */
    async testAI() {
        const aiError = document.getElementById('aiError');
        const aiSuccess = document.getElementById('aiSuccess');

        if (!aiError || !aiSuccess) return;

        // Hide previous messages
        aiError.style.display = 'none';
        aiSuccess.style.display = 'none';

        if (!cloudflareAPI.hasToken()) {
            aiError.textContent = '❌ Bitte konfiguriere zuerst deinen API-Token.';
            aiError.style.display = 'block';
            return;
        }

        this.showLoading();
        
        try {
            const result = await cloudflareAPI.testAI();
            this.hideLoading();
            
            if (result.success) {
                aiSuccess.innerHTML = `
✅ <strong>AI-Test erfolgreich!</strong><br>
Antwort: ${result.response}
                `;
                aiSuccess.style.display = 'block';
            } else {
                aiError.textContent = `❌ AI-Test fehlgeschlagen: ${result.error}`;
                aiError.style.display = 'block';
            }
        } catch (error) {
            this.hideLoading();
            aiError.textContent = `❌ AI-Test fehlgeschlagen: ${error.message}`;
            aiError.style.display = 'block';
        }
    }

    /**
     * Display current AI configuration
     */
    displayAIConfig(config) {
        const aiCurrentConfig = document.getElementById('aiCurrentConfig');
        const aiConfigDetails = document.getElementById('aiConfigDetails');
        
        if (!aiCurrentConfig || !aiConfigDetails) return;
        
        if (config.enabled) {
            aiConfigDetails.innerHTML = `
Status: <strong style="color: green;">Aktiviert</strong><br>
Modell: ${config.model}<br>
${config.gatewayName ? `Gateway: ${config.gatewayName}<br>` : ''}
${config.gatewayId ? `Gateway ID: ${config.gatewayId}` : ''}
            `;
            aiCurrentConfig.style.display = 'block';
        } else {
            aiCurrentConfig.style.display = 'none';
        }
    }

    /**
     * Update AI status indicator
     */
    updateAIStatus() {
        const statusSpan = document.getElementById('aiStatus');
        
        if (statusSpan) {
            const config = cloudflareAPI.getAIConfig();
            if (config.enabled) {
                statusSpan.textContent = '🤖 AI aktiv';
            } else {
                statusSpan.textContent = '🤖 AI konfigurieren';
            }
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
