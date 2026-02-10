# CloudflareHelper - Cloudflare Management Bot

Ein Web-basierter Chat-Bot zur Verwaltung von Cloudflare Domains, DNS-Einträgen und Rules.

## ⚠️ WICHTIG: CORS-Problem & Lösungen

Browser blockieren direkte API-Aufrufe an Cloudflare aus Sicherheitsgründen (CORS-Policy).

### **Lösung 1: Browser-Extension (Empfohlen für Tests)**

**Chrome/Edge:**
- Installiere "CORS Unblock" oder "Allow CORS: Access-Control-Allow-Origin"
- Aktiviere die Extension
- ⚠️ **Nur für lokale Tests verwenden!**

### **Lösung 2: CORS-Proxy (Im Tool integriert)**

1. Öffne das Token-Modal
2. Aktiviere die Checkbox "CORS-Proxy aktivieren"
3. ⚠️ **WARNUNG:** Token läuft über Drittanbieter-Server (nur für Tests!)

### **Lösung 3: Cloudflare Worker (Empfohlen für Produktion)**

Erstelle einen Cloudflare Worker als sicheren Proxy - siehe unten für Details.

---

## Features

✅ **Domain-Verwaltung**
- Alle Zones/Domains auflisten
- Zone-Details anzeigen
- Direkte Links zur Cloudflare-Konsole

✅ **DNS-Verwaltung**
- DNS-Einträge auflisten (gruppiert nach Typ)
- A, CNAME, TXT, MX Records erstellen
- Direkte Links zu DNS-Einträgen

✅ **Rules-Verwaltung**
- Rulesets und Page Rules auflisten
- Direkte Links zur Rules-Konsole

## Schnellstart

1. **Server starten:**
   ```bash
   python -m http.server 8000
   ```

2. **Browser öffnen:**
   ```
   http://localhost:8000
   ```

3. **CORS-Problem beheben** (siehe oben)

4. **API-Token konfigurieren:**
   - Klicke auf "Token konfigurieren"
   - Erstelle Token: [Cloudflare Dashboard → API Tokens](https://dash.cloudflare.com/profile/api-tokens)
   - Erforderliche Berechtigungen: Zone:Read, DNS:Edit, Zone Settings:Edit

## Verwendung

### Beispiel-Befehle:

```
Zeige mir alle Domains
Liste alle DNS-Einträge für example.com
Erstelle einen A-Record für test.example.com mit IP 192.168.1.1
Erstelle einen CNAME für www.example.com zu example.com
Info für example.com
Hilfe
```

## Cloudflare Worker als Proxy (Sichere Produktionslösung)

Erstelle einen Worker in deinem Cloudflare-Account:

```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(request.url)
  const apiUrl = 'https://api.cloudflare.com' + url.pathname

  const modifiedRequest = new Request(apiUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  })

  const response = await fetch(modifiedRequest)
  const modifiedResponse = new Response(response.body, response)

  Object.keys(corsHeaders).forEach(key => {
    modifiedResponse.headers.set(key, corsHeaders[key])
  })

  return modifiedResponse
}
```

Dann passe in `cloudflare-api.js` die `baseURL` auf deine Worker-URL an.

## Sicherheit

🔒 Token wird NUR im Browser (localStorage) gespeichert  
🔒 Keine Server-seitige Speicherung  
🔒 Bei CORS-Proxy: Token läuft über Drittanbieter (Risiko!)  

## Technologie

- HTML5, CSS3, Vanilla JavaScript
- Keine Dependencies
- Client-seitig
- Browser localStorage

## Dateien

```
index.html          # Chat-Interface
styles.css          # Styling
cloudflare-api.js   # API Client
chat-bot.js         # Bot-Logik
app.js              # Hauptlogik
```


## Funktionen
* Der API-Token von Cloudflare soll offline nur auf genutzt Browser gespeichert werden.

# Dokumentation / Links

## Domain
https://developers.cloudflare.com/api/resources/registrar/subresources/domains/methods/get/

## DNS
https://developers.cloudflare.com/api/resources/dns/

## Rules
https://developers.cloudflare.com/api/resources/rules/
