/**
 * Cloudflare API Client
 * Handles all API interactions with Cloudflare
 */

class CloudflareAPI {
    constructor() {
        this.baseURL = 'https://api.cloudflare.com/client/v4';
        this.token = this.getStoredToken();
        this.accountId = null;
        
        // CORS Proxy (optional) - WARNUNG: Nur für Tests verwenden!
        // Der Proxy kann potenziell deinen API-Token sehen
        this.useCorsProxy = localStorage.getItem('use_cors_proxy') === 'true';
        this.corsProxyURL = 'https://corsproxy.io/?';
        
        // Workers AI Configuration
        this.aiConfig = this.getStoredAIConfig();
    }

    /**
     * Get stored API token from localStorage
     */
    getStoredToken() {
        return localStorage.getItem('cloudflare_api_token');
    }

    /**
     * Save API token to localStorage
     */
    saveToken(token) {
        localStorage.setItem('cloudflare_api_token', token);
        this.token = token;
    }

    /**
     * Delete API token from localStorage
     */
    deleteToken() {
        localStorage.removeItem('cloudflare_api_token');
        this.token = null;
        this.accountId = null;
    }

    /**
     * Get stored AI configuration from localStorage
     */
    getStoredAIConfig() {
        const stored = localStorage.getItem('cloudflare_ai_config');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Failed to parse AI config:', e);
            }
        }
        return {
            enabled: false,
            model: '@cf/meta/llama-3.1-8b-instruct',
            gatewayId: null,
            gatewayName: null
        };
    }

    /**
     * Save AI configuration to localStorage
     */
    saveAIConfig(config) {
        this.aiConfig = { ...this.aiConfig, ...config };
        localStorage.setItem('cloudflare_ai_config', JSON.stringify(this.aiConfig));
    }

    /**
     * Get current AI configuration
     */
    getAIConfig() {
        return { ...this.aiConfig };
    }

    /**
     * Check if AI is configured
     */
    hasAIConfig() {
        return this.aiConfig.enabled && this.aiConfig.model && this.accountId;
    }

    /**
     * Enable CORS proxy (WARNING: Security risk!)
     */
    enableCorsProxy() {
        localStorage.setItem('use_cors_proxy', 'true');
        this.useCorsProxy = true;
    }

    /**
     * Disable CORS proxy
     */
    disableCorsProxy() {
        localStorage.setItem('use_cors_proxy', 'false');
        this.useCorsProxy = false;
    }

    /**
     * Check if CORS proxy is enabled
     */
    isCorsProxyEnabled() {
        return this.useCorsProxy;
    }

    /**
     * Check if token is configured
     */
    hasToken() {
        return !!this.token;
    }

    /**
     * Make API request
     */
    async request(endpoint, options = {}) {
        if (!this.token) {
            throw new Error('API-Token nicht konfiguriert. Bitte konfiguriere zuerst deinen Token.');
        }

        let url = `${this.baseURL}${endpoint}`;
        
        // Apply CORS proxy if enabled
        if (this.useCorsProxy) {
            url = `${this.corsProxyURL}${encodeURIComponent(url)}`;
        }
        
        const headers = {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
            ...options.headers
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.errors?.[0]?.message || `API-Fehler: ${response.status}`;
                throw new Error(errorMessage);
            }

            if (!data.success) {
                const errorMessage = data.errors?.[0]?.message || 'API-Anfrage fehlgeschlagen';
                throw new Error(errorMessage);
            }

            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    /**
     * Verify API token
     */
    async verifyToken() {
        try {
            const response = await this.request('/user/tokens/verify');
            return {
                success: true,
                data: response.result
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get user information
     */
    async getUserInfo() {
        const response = await this.request('/user');
        return response.result;
    }

    /**
     * Get all accounts
     */
    async getAccounts() {
        const response = await this.request('/accounts');
        return response.result;
    }

    /**
     * Get all zones (domains)
     */
    async getZones() {
        const response = await this.request('/zones');
        return response.result;
    }

    /**
     * Get zone by ID
     */
    async getZone(zoneId) {
        const response = await this.request(`/zones/${zoneId}`);
        return response.result;
    }

    /**
     * Get zone by domain name
     */
    async getZoneByName(domainName) {
        const response = await this.request(`/zones?name=${encodeURIComponent(domainName)}`);
        if (response.result.length === 0) {
            throw new Error(`Zone für Domain "${domainName}" nicht gefunden`);
        }
        return response.result[0];
    }

    /**
     * Add/Create a new zone (domain)
     * @param {string} domainName - Domain name to add (e.g., "example.com")
     * @param {string} accountId - Account ID (optional, will use first account if not provided)
     * @param {object} options - Additional options
     */
    async addZone(domainName, accountId = null, options = {}) {
        // If no account ID provided, get the first available account
        if (!accountId) {
            const accounts = await this.getAccounts();
            if (accounts.length === 0) {
                throw new Error('Kein Account gefunden. Bitte gib eine Account-ID an.');
            }
            accountId = accounts[0].id;
        }

        const zoneData = {
            name: domainName,
            account: {
                id: accountId
            },
            jump_start: options.jumpStart !== false, // Auto-detect DNS records
            type: options.type || 'full' // full or partial
        };

        const response = await this.request('/zones', {
            method: 'POST',
            body: JSON.stringify(zoneData)
        });
        
        return response.result;
    }

    /**
     * Get DNS records for a zone
     */
    async getDNSRecords(zoneId, options = {}) {
        let endpoint = `/zones/${zoneId}/dns_records`;
        const params = new URLSearchParams();

        if (options.type) params.append('type', options.type);
        if (options.name) params.append('name', options.name);
        if (options.content) params.append('content', options.content);

        const queryString = params.toString();
        if (queryString) endpoint += `?${queryString}`;

        const response = await this.request(endpoint);
        return response.result;
    }

    /**
     * Create DNS record
     */
    async createDNSRecord(zoneId, recordData) {
        const response = await this.request(`/zones/${zoneId}/dns_records`, {
            method: 'POST',
            body: JSON.stringify(recordData)
        });
        return response.result;
    }

    /**
     * Update DNS record
     */
    async updateDNSRecord(zoneId, recordId, recordData) {
        const response = await this.request(`/zones/${zoneId}/dns_records/${recordId}`, {
            method: 'PUT',
            body: JSON.stringify(recordData)
        });
        return response.result;
    }

    /**
     * Delete DNS record
     */
    async deleteDNSRecord(zoneId, recordId) {
        const response = await this.request(`/zones/${zoneId}/dns_records/${recordId}`, {
            method: 'DELETE'
        });
        return response.result;
    }

    /**
     * Get all rulesets for a zone
     */
    async getRulesets(zoneId) {
        try {
            const response = await this.request(`/zones/${zoneId}/rulesets`);
            return response.result;
        } catch (error) {
            // Fallback to page rules if rulesets not available
            return [];
        }
    }

    /**
     * Get page rules for a zone
     */
    async getPageRules(zoneId) {
        const response = await this.request(`/zones/${zoneId}/pagerules`);
        return response.result;
    }

    /**
     * Create a redirect rule (using Bulk Redirects)
     */
    async createRedirectRule(zoneId, ruleData) {
        // This uses the new Redirect Rules API
        const response = await this.request(`/zones/${zoneId}/rulesets`, {
            method: 'POST',
            body: JSON.stringify({
                name: ruleData.name || 'Redirect Rule',
                kind: 'zone',
                phase: 'http_request_dynamic_redirect',
                rules: [{
                    action: 'redirect',
                    action_parameters: {
                        from_value: {
                            status_code: ruleData.statusCode || 301,
                            target_url: {
                                value: ruleData.targetUrl
                            },
                            preserve_query_string: ruleData.preserveQueryString !== false
                        }
                    },
                    expression: ruleData.expression,
                    description: ruleData.description || ''
                }]
            })
        });
        return response.result;
    }

    /**
     * Get ruleset by ID
     */
    async getRuleset(zoneId, rulesetId) {
        const response = await this.request(`/zones/${zoneId}/rulesets/${rulesetId}`);
        return response.result;
    }

    /**
     * Update ruleset
     */
    async updateRuleset(zoneId, rulesetId, rulesetData) {
        const response = await this.request(`/zones/${zoneId}/rulesets/${rulesetId}`, {
            method: 'PUT',
            body: JSON.stringify(rulesetData)
        });
        return response.result;
    }

    /**
     * Delete ruleset
     */
    async deleteRuleset(zoneId, rulesetId) {
        const response = await this.request(`/zones/${zoneId}/rulesets/${rulesetId}`, {
            method: 'DELETE'
        });
        return response.result;
    }

    /**
     * Get zone settings
     */
    async getZoneSettings(zoneId) {
        const response = await this.request(`/zones/${zoneId}/settings`);
        return response.result;
    }

    /**
     * Update zone setting
     */
    async updateZoneSetting(zoneId, settingId, value) {
        const response = await this.request(`/zones/${zoneId}/settings/${settingId}`, {
            method: 'PATCH',
            body: JSON.stringify({ value })
        });
        return response.result;
    }

    /**
     * Generate Cloudflare Dashboard URL for a zone
     */
    getZoneDashboardURL(zoneIdOrName, accountId = null) {
        if (accountId) {
            return `https://dash.cloudflare.com/${accountId}/${zoneIdOrName}`;
        }
        return `https://dash.cloudflare.com/?to=/:account/${zoneIdOrName}`;
    }

    /**
     * Generate Cloudflare Dashboard URL for DNS records
     */
    getDNSDashboardURL(zoneIdOrName, accountId = null) {
        if (accountId) {
            return `https://dash.cloudflare.com/${accountId}/${zoneIdOrName}/dns`;
        }
        return `https://dash.cloudflare.com/?to=/:account/${zoneIdOrName}/dns`;
    }

    /**
     * Generate Cloudflare Dashboard URL for rules
     */
    getRulesDashboardURL(zoneIdOrName, accountId = null) {
        if (accountId) {
            return `https://dash.cloudflare.com/${accountId}/${zoneIdOrName}/rules`;
        }
        return `https://dash.cloudflare.com/?to=/:account/${zoneIdOrName}/rules`;
    }

    /**
     * Format DNS record for display
     */
    formatDNSRecord(record) {
        return {
            id: record.id,
            type: record.type,
            name: record.name,
            content: record.content,
            ttl: record.ttl === 1 ? 'Auto' : record.ttl,
            proxied: record.proxied || false,
            priority: record.priority || null
        };
    }

    /**
     * Validate DNS record data
     */
    validateDNSRecord(recordData) {
        const errors = [];

        if (!recordData.type) {
            errors.push('DNS-Record-Typ ist erforderlich');
        }

        if (!recordData.name) {
            errors.push('Name ist erforderlich');
        }

        if (!recordData.content) {
            errors.push('Inhalt ist erforderlich');
        }

        // Validate based on type
        if (recordData.type === 'A') {
            const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
            if (!ipv4Regex.test(recordData.content)) {
                errors.push('Ungültige IPv4-Adresse');
            }
        }

        if (recordData.type === 'AAAA') {
            const ipv6Regex = /^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$/;
            if (!ipv6Regex.test(recordData.content)) {
                errors.push('Ungültige IPv6-Adresse');
            }
        }

        if (recordData.type === 'MX' && !recordData.priority) {
            errors.push('Priorität ist für MX-Einträge erforderlich');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Search zones by name
     */
    async searchZones(searchTerm) {
        const response = await this.request(`/zones?name=${encodeURIComponent(searchTerm)}`);
        return response.result;
    }

    /**
     * Get analytics for a zone (optional, for advanced features)
     */
    async getZoneAnalytics(zoneId, params = {}) {
        const endpoint = `/zones/${zoneId}/analytics/dashboard`;
        const queryParams = new URLSearchParams(params);
        const response = await this.request(`${endpoint}?${queryParams}`);
        return response.result;
    }

    // ========================================
    // Workers AI Methods
    // ========================================

    /**
     * Get available Workers AI models
     */
    async getAIModels() {
        if (!this.accountId) {
            const accounts = await this.getAccounts();
            if (accounts.length === 0) {
                throw new Error('Kein Account gefunden');
            }
            this.accountId = accounts[0].id;
        }

        // List of popular Cloudflare Workers AI models
        // Note: The API doesn't provide a direct list endpoint, so we return known models
        return [
            {
                id: '@cf/meta/llama-3.1-8b-instruct',
                name: 'Llama 3.1 8B Instruct',
                type: 'text-generation',
                description: 'Fast and efficient text generation'
            },
            {
                id: '@cf/meta/llama-3.1-70b-instruct',
                name: 'Llama 3.1 70B Instruct',
                type: 'text-generation',
                description: 'More powerful text generation'
            },
            {
                id: '@cf/meta/llama-3-8b-instruct',
                name: 'Llama 3 8B Instruct',
                type: 'text-generation',
                description: 'Previous generation Llama model'
            },
            {
                id: '@cf/mistral/mistral-7b-instruct-v0.1',
                name: 'Mistral 7B Instruct',
                type: 'text-generation',
                description: 'Mistral AI instruction model'
            },
            {
                id: '@cf/qwen/qwen1.5-14b-chat-awq',
                name: 'Qwen 1.5 14B Chat',
                type: 'text-generation',
                description: 'Qwen chat model'
            },
            {
                id: '@cf/google/gemma-7b-it',
                name: 'Gemma 7B IT',
                type: 'text-generation',
                description: 'Google Gemma instruction tuned'
            }
        ];
    }

    /**
     * Create or get AI Gateway
     */
    async setupAIGateway(gatewayName = 'cloudflare-helper-gateway') {
        if (!this.accountId) {
            const accounts = await this.getAccounts();
            if (accounts.length === 0) {
                throw new Error('Kein Account gefunden');
            }
            this.accountId = accounts[0].id;
        }

        try {
            // Try to get existing gateways
            const gateways = await this.getAIGateways();
            const existing = gateways.find(g => g.name === gatewayName);
            
            if (existing) {
                return existing;
            }

            // Create new gateway
            return await this.createAIGateway(gatewayName);
        } catch (error) {
            console.error('AI Gateway setup error:', error);
            throw error;
        }
    }

    /**
     * Get all AI Gateways
     */
    async getAIGateways() {
        if (!this.accountId) {
            const accounts = await this.getAccounts();
            if (accounts.length === 0) {
                throw new Error('Kein Account gefunden');
            }
            this.accountId = accounts[0].id;
        }

        const response = await this.request(`/accounts/${this.accountId}/ai-gateway/gateways`);
        return response.result;
    }

    /**
     * Create new AI Gateway
     */
    async createAIGateway(name) {
        if (!this.accountId) {
            const accounts = await this.getAccounts();
            if (accounts.length === 0) {
                throw new Error('Kein Account gefunden');
            }
            this.accountId = accounts[0].id;
        }

        const response = await this.request(`/accounts/${this.accountId}/ai-gateway/gateways`, {
            method: 'POST',
            body: JSON.stringify({
                name: name,
                cache_ttl: 3600,
                collect_logs: true,
                rate_limiting_interval: 60,
                rate_limiting_limit: 100,
                rate_limiting_technique: 'sliding"
            })
        });
        return response.result;
    }

    /**
     * Run AI inference using Workers AI
     */
    async runAI(messages, model = null) {
        if (!this.accountId) {
            const accounts = await this.getAccounts();
            if (accounts.length === 0) {
                throw new Error('Kein Account gefunden');
            }
            this.accountId = accounts[0].id;
        }

        const selectedModel = model || this.aiConfig.model || '@cf/meta/llama-3.1-8b-instruct';

        const response = await this.request(
            `/accounts/${this.accountId}/ai/run/${selectedModel}`,
            {
                method: 'POST',
                body: JSON.stringify({
                    messages: messages
                })
            }
        );

        return response.result;
    }

    /**
     * Send a chat message to Workers AI
     */
    async chatWithAI(userMessage, conversationHistory = []) {
        const messages = [
            ...conversationHistory,
            { role: 'user', content: userMessage }
        ];

        const result = await this.runAI(messages);
        return result.response || result.content || result;
    }

    /**
     * Test AI configuration
     */
    async testAI() {
        try {
            const response = await this.chatWithAI('Hello! Say "OK" if you can hear me.');
            return {
                success: true,
                response: response
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Export for use in other scripts
const cloudflareAPI = new CloudflareAPI();
