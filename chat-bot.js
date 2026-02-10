/**
 * Chat Bot Logic
 * Handles natural language processing and command interpretation
 */

class ChatBot {
    constructor(api) {
        this.api = api;
        this.context = {
            lastZone: null,
            lastDomain: null
        };
    }

    /**
     * Process user message and generate response
     */
    async processMessage(message) {
        const normalizedMessage = message.toLowerCase().trim();

        // Domain-only lookup (no token required)
        if (this.isDomainListMessage(message)) {
            return await this.getDomainInfoTable(message);
        }

        // Check if token is configured
        if (!this.api.hasToken() && !this.isTokenRelatedCommand(normalizedMessage)) {
            return {
                type: 'error',
                message: '⚠️ Bitte konfiguriere zuerst deinen Cloudflare API-Token, um fortzufahren.',
                action: 'configure_token'
            };
        }

        // Help command
        if (this.isHelpCommand(normalizedMessage)) {
            return this.getHelpResponse();
        }

        // List all zones/domains
        if (this.isListZonesCommand(normalizedMessage)) {
            return await this.listZones();
        }

        // Add domain
        if (this.isAddDomainCommand(normalizedMessage)) {
            return await this.addDomain(message);
        }

        // List DNS records
        if (this.isListDNSCommand(normalizedMessage)) {
            return await this.listDNSRecords(message);
        }

        // Create DNS record
        if (this.isCreateDNSCommand(normalizedMessage)) {
            return await this.createDNSRecord(message);
        }

        // Delete DNS record
        if (this.isDeleteDNSCommand(normalizedMessage)) {
            return await this.deleteDNSRecord(message);
        }

        // List rules/redirects
        if (this.isListRulesCommand(normalizedMessage)) {
            return await this.listRules(message);
        }

        // Create redirect
        if (this.isCreateRedirectCommand(normalizedMessage)) {
            return await this.createRedirect(message);
        }

        // Get zone info
        if (this.isZoneInfoCommand(normalizedMessage)) {
            return await this.getZoneInfo(message);
        }

        // Default response
        return this.getDefaultResponse();
    }

    /**
     * Check if command is token-related
     */
    isTokenRelatedCommand(message) {
        return message.includes('token') || message.includes('api');
    }

    /**
     * Check if message contains only one or more domains
     */
    isDomainListMessage(message) {
        return this.extractDomains(message).length > 0;
    }

    /**
     * Extract domains if message contains only domains
     */
    extractDomains(message) {
        const trimmed = message.trim();
        if (!trimmed) return [];

        const tokens = trimmed.split(/[\s,;]+/).filter(Boolean);
        if (tokens.length === 0) return [];

        const domainRegex = /^[a-z0-9]+([-.]?[a-z0-9]+)*\.[a-z]{2,}$/i;
        const domains = [];

        for (const token of tokens) {
            const cleaned = token.replace(/^\.+|\.+$/g, '');
            if (!domainRegex.test(cleaned)) {
                return [];
            }
            domains.push(cleaned.toLowerCase());
        }

        return [...new Set(domains)];
    }

    /**
     * Check if command is help-related
     */
    isHelpCommand(message) {
        return message.includes('hilfe') || 
               message.includes('help') || 
               message.includes('was kannst du') ||
               message.includes('befehle');
    }

    /**
     * Check if command is to list zones
     */
    isListZonesCommand(message) {
        return (message.includes('zeige') || message.includes('liste') || message.includes('alle')) &&
               (message.includes('domain') || message.includes('zone'));
    }

    /**
     * Check if command is to add a domain
     */
    isAddDomainCommand(message) {
        return (message.includes('füge') || message.includes('hinzu') || message.includes('erstelle') || message.includes('add')) &&
               (message.includes('domain') || message.includes('zone')) &&
               !message.includes('dns') && !message.includes('record') && !message.includes('eintrag');
    }

    /**
     * Check if command is to list DNS records
     */
    isListDNSCommand(message) {
        return (message.includes('dns') || message.includes('einträge') || message.includes('records')) &&
               (message.includes('liste') || message.includes('zeige') || message.includes('alle'));
    }

    /**
     * Check if command is to create DNS record
     */
    isCreateDNSCommand(message) {
        return (message.includes('erstelle') || message.includes('create') || message.includes('hinzufügen') || message.includes('add')) &&
               (message.includes('dns') || message.includes('record') || message.includes('eintrag') || 
                message.includes('a-record') || message.includes('cname') || message.includes('txt'));
    }

    /**
     * Check if command is to delete DNS record
     */
    isDeleteDNSCommand(message) {
        return (message.includes('lösche') || message.includes('delete') || message.includes('entferne') || message.includes('remove')) &&
               (message.includes('dns') || message.includes('record') || message.includes('eintrag'));
    }

    /**
     * Check if command is to list rules
     */
    isListRulesCommand(message) {
        return (message.includes('regel') || message.includes('rule') || message.includes('weiterleitung') || message.includes('redirect')) &&
               (message.includes('liste') || message.includes('zeige') || message.includes('alle'));
    }

    /**
     * Check if command is to create redirect
     */
    isCreateRedirectCommand(message) {
        return (message.includes('erstelle') || message.includes('create') || message.includes('hinzufügen')) &&
               (message.includes('weiterleitung') || message.includes('redirect'));
    }

    /**
     * Check if command is to get zone info
     */
    isZoneInfoCommand(message) {
        return (message.includes('info') || message.includes('details') || message.includes('zeige')) &&
               (message.includes('zone') || message.includes('domain'));
    }

    /**
     * Get help response
     */
    getHelpResponse() {
        return {
            type: 'info',
            message: `
<strong>📚 CloudflareHelper Befehle:</strong><br><br>

<strong>Domain/Zone-Verwaltung:</strong><br>
• "Zeige mir alle Domains" - Liste aller Zones<br>
• "Füge Domain example.com hinzu" - Neue Domain hinzufügen<br>
• "Erstelle Domain example.com" - Neue Domain erstellen<br>
• "Info für example.com" - Details zu einer Zone<br><br>

<strong>DNS-Verwaltung:</strong><br>
• "Liste alle DNS-Einträge für example.com"<br>
• "Erstelle einen A-Record für test.example.com mit IP 192.168.1.1"<br>
• "Erstelle einen CNAME-Record für www.example.com zu example.com"<br>
• "Erstelle einen TXT-Record für example.com mit Inhalt 'verification=abc123'"<br>
• "Lösche DNS-Eintrag [ID] für example.com"<br><br>

<strong>Rules/Weiterleitungen:</strong><br>
• "Liste alle Weiterleitungen für example.com"<br>
• "Zeige alle Regeln"<br><br>

<strong>Allgemein:</strong><br>
• "Hilfe" - Diese Hilfe anzeigen<br>
• Token über den Button oben rechts konfigurieren<br><br>

<em>Tipp: Du kannst Befehle in natürlicher Sprache eingeben!</em>
            `
        };
    }

    /**
     * List all zones
     */
    async listZones() {
        try {
            const zones = await this.api.getZones();

            if (zones.length === 0) {
                return {
                    type: 'info',
                    message: 'ℹ️ Keine Domains/Zones gefunden. Möglicherweise hat dein API-Token keine Berechtigung oder es sind keine Zones vorhanden.'
                };
            }

            let message = `<strong>📋 Gefundene Domains/Zones (${zones.length}):</strong><br><br>`;

            zones.forEach((zone, index) => {
                const dashboardURL = this.api.getZoneDashboardURL(zone.name, zone.account?.id);
                const status = zone.status === 'active' ? '✅' : '⚠️';
                
                message += `
<div class="info-card">
    <div class="info-card-header">${status} ${zone.name}</div>
    <div class="info-card-body">
        <strong>Status:</strong> ${zone.status}<br>
        <strong>Zone-ID:</strong> <code>${zone.id}</code><br>
        ${zone.account?.name ? `<strong>Account:</strong> ${zone.account.name}<br>` : ''}
    </div>
    <div class="info-card-footer">
        <a href="${dashboardURL}" target="_blank">🔗 In Cloudflare öffnen</a> | 
        <a href="${this.api.getDNSDashboardURL(zone.name, zone.account?.id)}" target="_blank">DNS</a> | 
        <a href="${this.api.getRulesDashboardURL(zone.name, zone.account?.id)}" target="_blank">Rules</a>
    </div>
</div>
                `;
            });

            // Store last zone for context
            if (zones.length > 0) {
                this.context.lastZone = zones[0];
            }

            return {
                type: 'success',
                message: message
            };
        } catch (error) {
            return {
                type: 'error',
                message: `❌ Fehler beim Abrufen der Domains: ${error.message}`
            };
        }
    }

    /**
     * Add a new domain/zone
     */
    async addDomain(message) {
        try {
            // Extract domain name from message
            // Patterns: "Füge Domain example.com hinzu", "Erstelle Domain example.com"
            const domainMatch = message.match(/(?:füge|hinzu|erstelle|add)\s+(?:domain\s+)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) ||
                              message.match(/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s+(?:hinzufügen|erstellen)/i);

            if (!domainMatch) {
                return {
                    type: 'error',
                    message: `❌ Konnte Domain-Namen nicht aus der Nachricht extrahieren.<br><br>
<strong>Beispiele:</strong><br>
• "Füge Domain example.com hinzu"<br>
• "Erstelle Domain example.com"<br>
• "Add example.com"`
                };
            }

            const domainName = domainMatch[1].toLowerCase();

            // Validate domain name format
            const domainRegex = /^[a-z0-9]+([-.]?[a-z0-9]+)*\.[a-z]{2,}$/;
            if (!domainRegex.test(domainName)) {
                return {
                    type: 'error',
                    message: `❌ Ungültiger Domain-Name: "${domainName}"<br><br>Bitte gib einen gültigen Domain-Namen ein (z.B. example.com)`
                };
            }

            // Check if domain already exists
            try {
                const existingZone = await this.api.getZoneByName(domainName);
                return {
                    type: 'info',
                    message: `ℹ️ Die Domain "${domainName}" existiert bereits in deinem Account.<br><br>
<strong>Status:</strong> ${existingZone.status}<br>
<strong>Zone-ID:</strong> <code>${existingZone.id}</code><br><br>
<a href="${this.api.getZoneDashboardURL(existingZone.name, existingZone.account?.id)}" target="_blank">🔗 In Cloudflare öffnen</a>`
                };
            } catch (e) {
                // Domain doesn't exist, continue with creation
            }

            // Get account ID from message or use first account
            let accountId = null;
            const accountMatch = message.match(/(?:account|account-id)\s+([a-f0-9]{32})/i);
            if (accountMatch) {
                accountId = accountMatch[1];
            }

            // Create the zone
            const newZone = await this.api.addZone(domainName, accountId);

            return {
                type: 'success',
                message: `
✅ <strong>Domain erfolgreich hinzugefügt!</strong><br><br>
<div class="info-card">
    <div class="info-card-header">🎉 ${newZone.name}</div>
    <div class="info-card-body">
        <strong>Status:</strong> ${newZone.status}<br>
        <strong>Zone-ID:</strong> <code>${newZone.id}</code><br>
        ${newZone.account?.name ? `<strong>Account:</strong> ${newZone.account.name}<br>` : ''}<br>
        <strong>Nächste Schritte:</strong><br>
        1. Aktualisiere deine Nameserver bei deinem Domain-Registrar<br>
        2. Nameserver:<br>
        ${newZone.name_servers ? newZone.name_servers.map(ns => `&nbsp;&nbsp;&nbsp;• <code>${ns}</code>`).join('<br>') : ''}<br>
    </div>
    <div class="info-card-footer">
        <a href="${this.api.getZoneDashboardURL(newZone.name, newZone.account?.id)}" target="_blank">🔗 In Cloudflare öffnen</a> | 
        <a href="${this.api.getDNSDashboardURL(newZone.name, newZone.account?.id)}" target="_blank">DNS konfigurieren</a>
    </div>
</div>
                `
            };
        } catch (error) {
            return {
                type: 'error',
                message: `❌ Fehler beim Hinzufügen der Domain: ${error.message}<br><br>
ℹ️ Stelle sicher, dass dein API-Token die Berechtigung "Zone:Edit" hat.`
            };
        }
    }

    /**
     * List DNS records for a zone
     */
    async listDNSRecords(message) {
        try {
            // Extract domain name from message
            const domainMatch = message.match(/für\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) ||
                              message.match(/von\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) ||
                              message.match(/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);

            let zone;
            if (domainMatch) {
                const domainName = domainMatch[1];
                zone = await this.api.getZoneByName(domainName);
            } else if (this.context.lastZone) {
                zone = this.context.lastZone;
            } else {
                return {
                    type: 'error',
                    message: '❌ Bitte gib einen Domain-Namen an, z.B. "Liste DNS-Einträge für example.com"'
                };
            }

            const records = await this.api.getDNSRecords(zone.id);

            if (records.length === 0) {
                return {
                    type: 'info',
                    message: `ℹ️ Keine DNS-Einträge für ${zone.name} gefunden.`
                };
            }

            let responseMessage = `<strong>🌐 DNS-Einträge für ${zone.name} (${records.length}):</strong><br><br>`;

            // Group records by type
            const recordsByType = {};
            records.forEach(record => {
                if (!recordsByType[record.type]) {
                    recordsByType[record.type] = [];
                }
                recordsByType[record.type].push(record);
            });

            Object.keys(recordsByType).sort().forEach(type => {
                responseMessage += `<strong>${type} Records (${recordsByType[type].length}):</strong><br>`;
                recordsByType[type].forEach(record => {
                    const proxied = record.proxied ? '🟠 Proxied' : '⚪ DNS only';
                    responseMessage += `
<div class="info-card">
    <div class="info-card-header">${record.name}</div>
    <div class="info-card-body">
        <strong>Typ:</strong> ${record.type}<br>
        <strong>Inhalt:</strong> <code>${record.content}</code><br>
        <strong>TTL:</strong> ${record.ttl === 1 ? 'Auto' : record.ttl}<br>
        ${record.proxied !== undefined ? `<strong>Proxy:</strong> ${proxied}<br>` : ''}
        ${record.priority ? `<strong>Priorität:</strong> ${record.priority}<br>` : ''}
        <strong>ID:</strong> <code>${record.id}</code>
    </div>
</div>
                    `;
                });
                responseMessage += '<br>';
            });

            responseMessage += `<br><a href="${this.api.getDNSDashboardURL(zone.name, zone.account?.id)}" target="_blank">🔗 DNS-Einträge in Cloudflare bearbeiten</a>`;

            // Store zone in context
            this.context.lastZone = zone;

            return {
                type: 'success',
                message: responseMessage
            };
        } catch (error) {
            return {
                type: 'error',
                message: `❌ Fehler beim Abrufen der DNS-Einträge: ${error.message}`
            };
        }
    }

    /**
     * Create DNS record
     */
    async createDNSRecord(message) {
        try {
            // Parse the message to extract DNS record details
            const patterns = {
                // A-Record: "Erstelle einen A-Record für test.example.com mit IP 192.168.1.1"
                aRecord: /a[-\s]?record\s+für\s+([a-zA-Z0-9.-]+)\s+mit\s+ip\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/i,
                
                // CNAME: "Erstelle einen CNAME für www.example.com zu example.com"
                cnameRecord: /cname[-\s]?record\s+für\s+([a-zA-Z0-9.-]+)\s+(?:zu|to|auf)\s+([a-zA-Z0-9.-]+)/i,
                
                // TXT: "Erstelle einen TXT-Record für example.com mit Inhalt 'text'"
                txtRecord: /txt[-\s]?record\s+für\s+([a-zA-Z0-9.-]+)\s+mit\s+(?:inhalt|text|content)\s+['"]?([^'"]+)['"]?/i,
                
                // MX: "Erstelle einen MX-Record für example.com mit Server mail.example.com Priorität 10"
                mxRecord: /mx[-\s]?record\s+für\s+([a-zA-Z0-9.-]+)\s+mit\s+server\s+([a-zA-Z0-9.-]+)\s+priorität\s+(\d+)/i
            };

            let recordData = null;
            let recordType = null;

            // Try to match A-Record
            let match = message.match(patterns.aRecord);
            if (match) {
                recordType = 'A';
                recordData = {
                    type: 'A',
                    name: match[1],
                    content: match[2],
                    ttl: 1,
                    proxied: false
                };
            }

            // Try to match CNAME
            if (!recordData) {
                match = message.match(patterns.cnameRecord);
                if (match) {
                    recordType = 'CNAME';
                    recordData = {
                        type: 'CNAME',
                        name: match[1],
                        content: match[2],
                        ttl: 1,
                        proxied: false
                    };
                }
            }

            // Try to match TXT
            if (!recordData) {
                match = message.match(patterns.txtRecord);
                if (match) {
                    recordType = 'TXT';
                    recordData = {
                        type: 'TXT',
                        name: match[1],
                        content: match[2],
                        ttl: 1
                    };
                }
            }

            // Try to match MX
            if (!recordData) {
                match = message.match(patterns.mxRecord);
                if (match) {
                    recordType = 'MX';
                    recordData = {
                        type: 'MX',
                        name: match[1],
                        content: match[2],
                        priority: parseInt(match[3]),
                        ttl: 1
                    };
                }
            }

            if (!recordData) {
                return {
                    type: 'error',
                    message: `❌ Konnte DNS-Record nicht aus der Nachricht extrahieren.<br><br>
<strong>Beispiele:</strong><br>
• "Erstelle einen A-Record für test.example.com mit IP 192.168.1.1"<br>
• "Erstelle einen CNAME für www.example.com zu example.com"<br>
• "Erstelle einen TXT-Record für example.com mit Inhalt 'verification=123'"<br>
• "Erstelle einen MX-Record für example.com mit Server mail.example.com Priorität 10"`
                };
            }

            // Validate record
            const validation = this.api.validateDNSRecord(recordData);
            if (!validation.valid) {
                return {
                    type: 'error',
                    message: `❌ Ungültige DNS-Record-Daten:<br>• ${validation.errors.join('<br>• ')}`
                };
            }

            // Extract domain from record name
            const nameParts = recordData.name.split('.');
            const domain = nameParts.slice(-2).join('.');

            // Get zone
            const zone = await this.api.getZoneByName(domain);

            // Create the record
            const createdRecord = await this.api.createDNSRecord(zone.id, recordData);

            const formattedRecord = this.api.formatDNSRecord(createdRecord);

            return {
                type: 'success',
                message: `
✅ <strong>DNS-Record erfolgreich erstellt!</strong><br><br>
<div class="info-card">
    <div class="info-card-header">${formattedRecord.type} Record</div>
    <div class="info-card-body">
        <strong>Name:</strong> ${formattedRecord.name}<br>
        <strong>Inhalt:</strong> <code>${formattedRecord.content}</code><br>
        <strong>TTL:</strong> ${formattedRecord.ttl}<br>
        ${formattedRecord.proxied !== undefined ? `<strong>Proxied:</strong> ${formattedRecord.proxied ? 'Ja' : 'Nein'}<br>` : ''}
        ${formattedRecord.priority ? `<strong>Priorität:</strong> ${formattedRecord.priority}<br>` : ''}
    </div>
    <div class="info-card-footer">
        <a href="${this.api.getDNSDashboardURL(zone.name, zone.account?.id)}" target="_blank">🔗 In Cloudflare öffnen</a>
    </div>
</div>
                `
            };
        } catch (error) {
            return {
                type: 'error',
                message: `❌ Fehler beim Erstellen des DNS-Eintrags: ${error.message}`
            };
        }
    }

    /**
     * Delete DNS record
     */
    async deleteDNSRecord(message) {
        return {
            type: 'info',
            message: 'ℹ️ DNS-Einträge löschen ist noch nicht implementiert. Bitte nutze die Cloudflare-Konsole.'
        };
    }

    /**
     * List rules for a zone
     */
    async listRules(message) {
        try {
            // Extract domain name
            const domainMatch = message.match(/für\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) ||
                              message.match(/von\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) ||
                              message.match(/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);

            let zone;
            if (domainMatch) {
                const domainName = domainMatch[1];
                zone = await this.api.getZoneByName(domainName);
            } else if (this.context.lastZone) {
                zone = this.context.lastZone;
            } else {
                return {
                    type: 'error',
                    message: '❌ Bitte gib einen Domain-Namen an, z.B. "Liste Regeln für example.com"'
                };
            }

            // Try to get rulesets
            let rulesets = [];
            let pageRules = [];
            let rulesetsError = null;
            let pageRulesError = null;

            // Try to get rulesets
            try {
                rulesets = await this.api.getRulesets(zone.id);
            } catch (e) {
                rulesetsError = e.message;
            }

            // Try to get page rules
            try {
                pageRules = await this.api.getPageRules(zone.id);
            } catch (e) {
                pageRulesError = e.message;
            }

            let responseMessage = `<strong>🔀 Regeln für ${zone.name}:</strong><br><br>`;

            if (rulesets.length === 0 && pageRules.length === 0) {
                let message = `ℹ️ Keine Regeln für ${zone.name} gefunden.`;
                
                if (rulesetsError || pageRulesError) {
                    message += `<br><br><strong>⚠️ Hinweis:</strong><br>`;
                    if (rulesetsError) {
                        message += `Rulesets konnten nicht abgerufen werden<br>`;
                    }
                    if (pageRulesError) {
                        message += `Page Rules konnten nicht abgerufen werden<br>`;
                    }
                    message += `<br>Dies könnte ein CORS-Proxy-Problem sein. Versuche, den CORS-Proxy zu deaktivieren.`;
                }
                
                return {
                    type: 'info',
                    message: message
                };
            }

            // Display rulesets
            if (rulesets.length > 0) {
                responseMessage += `<strong>Rulesets (${rulesets.length}):</strong><br>`;
                rulesets.forEach(ruleset => {
                    responseMessage += `
<div class="info-card">
    <div class="info-card-header">${ruleset.name || 'Unnamed Ruleset'}</div>
    <div class="info-card-body">
        <strong>Phase:</strong> ${ruleset.phase}<br>
        <strong>Kind:</strong> ${ruleset.kind}<br>
        <strong>Regeln:</strong> ${ruleset.rules?.length || 0}<br>
        <strong>ID:</strong> <code>${ruleset.id}</code>
    </div>
</div>
                    `;
                });
            } else if (rulesetsError) {
                responseMessage += `<strong>Rulesets:</strong> Fehler beim Abrufen<br><small>Grund: ${rulesetsError}</small><br><br>`;
            }

            // Display page rules
            if (pageRules.length > 0) {
                responseMessage += `<br><strong>Page Rules (${pageRules.length}):</strong><br>`;
                pageRules.forEach(rule => {
                    const status = rule.status === 'active' ? '✅' : '⚠️';
                    responseMessage += `
<div class="info-card">
    <div class="info-card-header">${status} ${rule.targets?.[0]?.constraint?.value || 'N/A'}</div>
    <div class="info-card-body">
        <strong>Status:</strong> ${rule.status}<br>
        <strong>Priorität:</strong> ${rule.priority}<br>
        <strong>ID:</strong> <code>${rule.id}</code>
    </div>
</div>
                    `;
                });
            } else if (pageRulesError) {
                responseMessage += `<strong>Page Rules:</strong> Fehler beim Abrufen<br><small>Grund: ${pageRulesError}</small><br><br>`;
            }

            responseMessage += `<br><a href="${this.api.getRulesDashboardURL(zone.name, zone.account?.id)}" target="_blank">🔗 Regeln in Cloudflare bearbeiten</a>`;

            this.context.lastZone = zone;

            return {
                type: 'success',
                message: responseMessage
            };
        } catch (error) {
            return {
                type: 'error',
                message: `❌ Fehler beim Abrufen der Regeln: ${error.message}<br><br>ℹ️ Hinweis: Dies könnte ein CORS-Proxy-Problem sein. Versuche, den CORS-Proxy zu deaktivieren.`
            };
        }
    }

    /**
     * Create redirect rule
     */
    async createRedirect(message) {
        return {
            type: 'info',
            message: 'ℹ️ Weiterleitungen erstellen ist noch nicht implementiert. Bitte nutze die Cloudflare-Konsole.'
        };
    }

    /**
     * Get zone information
     */
    async getZoneInfo(message) {
        try {
            const domainMatch = message.match(/für\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) ||
                              message.match(/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);

            if (!domainMatch) {
                return {
                    type: 'error',
                    message: '❌ Bitte gib einen Domain-Namen an, z.B. "Info für example.com"'
                };
            }

            const domainName = domainMatch[1];
            const zone = await this.api.getZoneByName(domainName);

            const status = zone.status === 'active' ? '✅ Aktiv' : '⚠️ Inaktiv';

            let responseMessage = `
<strong>📊 Zone-Informationen für ${zone.name}:</strong><br><br>
<div class="info-card">
    <div class="info-card-header">${zone.name}</div>
    <div class="info-card-body">
        <strong>Status:</strong> ${status}<br>
        <strong>Zone-ID:</strong> <code>${zone.id}</code><br>
        ${zone.account?.name ? `<strong>Account:</strong> ${zone.account.name}<br>` : ''}
        ${zone.account?.id ? `<strong>Account-ID:</strong> <code>${zone.account.id}</code><br>` : ''}
        <strong>Nameserver:</strong><br>
        ${zone.name_servers ? zone.name_servers.map(ns => `&nbsp;&nbsp;• ${ns}`).join('<br>') : 'N/A'}<br>
        ${zone.original_name_servers ? `<strong>Original Nameserver:</strong><br>${zone.original_name_servers.map(ns => `&nbsp;&nbsp;• ${ns}`).join('<br>')}<br>` : ''}
    </div>
    <div class="info-card-footer">
        <a href="${this.api.getZoneDashboardURL(zone.name, zone.account?.id)}" target="_blank">🔗 In Cloudflare öffnen</a> | 
        <a href="${this.api.getDNSDashboardURL(zone.name, zone.account?.id)}" target="_blank">DNS</a> | 
        <a href="${this.api.getRulesDashboardURL(zone.name, zone.account?.id)}" target="_blank">Rules</a>
    </div>
</div>
            `;

            this.context.lastZone = zone;

            return {
                type: 'success',
                message: responseMessage
            };
        } catch (error) {
            return {
                type: 'error',
                message: `❌ Fehler beim Abrufen der Zone-Informationen: ${error.message}`
            };
        }
    }

    /**
     * Get default response when command is not understood
     */
    getDefaultResponse() {
        return {
            type: 'info',
            message: `
ℹ️ <strong>Ich habe deine Anfrage nicht verstanden.</strong><br><br>
Versuche es mit einem dieser Befehle:<br>
• "Zeige mir alle Domains"<br>
• "Liste DNS-Einträge für example.com"<br>
• "Erstelle einen A-Record für test.example.com mit IP 192.168.1.1"<br>
• "Zeige Regeln für example.com"<br>
• "Hilfe" - Für eine vollständige Liste der Befehle<br><br>
<em>Du kannst auch die Quick-Action-Buttons unter dem Chat verwenden!</em>
            `
        };
    }

    /**
     * Return a table for domain lookups (IP, ISP, nameserver)
     */
    async getDomainInfoTable(message) {
        const domains = this.extractDomains(message);

        if (domains.length === 0) {
            return this.getDefaultResponse();
        }

        try {
            const results = await Promise.all(
                domains.map(async (domain) => {
                    try {
                        const info = await this.resolveDomainInfo(domain);
                        return { domain, ...info };
                    } catch (error) {
                        return { domain, error: error.message || 'Unbekannter Fehler' };
                    }
                })
            );

            const tableRows = results.map((result) => {
                if (result.error) {
                    return `
<tr>
    <td>${result.domain}</td>
    <td colspan="3">❌ ${result.error}</td>
</tr>
                    `;
                }

                const ipList = result.ips.length > 0 ? result.ips.join('<br>') : 'N/A';
                const isp = result.isp || 'N/A';
                const nsList = result.nameservers.length > 0 ? result.nameservers.join('<br>') : 'N/A';

                return `
<tr>
    <td>${result.domain}</td>
    <td>${ipList}</td>
    <td>${isp}</td>
    <td>${nsList}</td>
</tr>
                `;
            }).join('');

            const table = `
<strong>🔎 Domain-Info (${results.length}):</strong><br><br>
<table class="info-table">
    <thead>
        <tr>
            <th>Domain</th>
            <th>IP</th>
            <th>Hoster (ISP)</th>
            <th>Nameserver</th>
        </tr>
    </thead>
    <tbody>
        ${tableRows}
    </tbody>
</table>
            `;

            return {
                type: 'success',
                message: table
            };
        } catch (error) {
            return {
                type: 'error',
                message: `❌ Fehler beim Abrufen der Domain-Infos: ${error.message}`
            };
        }
    }

    async resolveDomainInfo(domain) {
        const [aRecords, nsRecords] = await Promise.all([
            this.fetchDnsRecords(domain, 'A'),
            this.fetchDnsRecords(domain, 'NS')
        ]);

        const ips = aRecords.map((record) => record.data).filter(Boolean);
        const nameservers = nsRecords.map((record) => record.data).filter(Boolean);
        let isp = null;

        if (ips.length > 0) {
            isp = await this.fetchIpOrganization(ips[0]);
        }

        return { ips, nameservers, isp };
    }

    async fetchDnsRecords(domain, type) {
        const url = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`DNS-Abfrage fehlgeschlagen (${response.status})`);
        }

        const data = await response.json();
        return Array.isArray(data.Answer) ? data.Answer : [];
    }

    async fetchIpOrganization(ip) {
        try {
            const response = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/org/`);
            if (!response.ok) {
                return null;
            }
            const text = (await response.text()).trim();
            return text ? text : null;
        } catch (error) {
            return null;
        }
    }
}

// Export for use in other scripts
const chatBot = new ChatBot(cloudflareAPI);
