# GitHub Copilot Prompt - CloudflareHelper Bot

## Projektbeschreibung

Erstelle einen AI-gestützten Web-Chat-Bot namens "CloudflareHelper" zur Verwaltung von Cloudflare-Accounts, Domains, DNS-Einträgen und Rules.

## Technische Anforderungen

### Sicherheit
- Der Cloudflare API-Token muss ausschließlich im Browser gespeichert werden (localStorage/sessionStorage)
- Keine Übertragung oder Speicherung des Tokens auf einem Server
- Alle API-Aufrufe erfolgen client-seitig

### Architektur
- Web-basierte Chat-Schnittstelle
- Client-seitige Integration mit der Cloudflare API
- Unterstützung für mehrere Accounts und Domains

## Feature-Anforderungen

### 1. Domain-Verwaltung
**Funktionen:**
- Domains erstellen und bearbeiten
- Verwaltung mehrerer Domains gleichzeitig
- Direkte Links zu den Domains in der Cloudflare-Konsole generieren

**API-Dokumentation:**
https://developers.cloudflare.com/api/resources/registrar/subresources/domains/methods/get/

**Erwartetes Verhalten:**
- Liste aller verfügbaren Domains anzeigen
- Domain-Details abrufen und anpassen
- Neue Domains registrieren
- Deep-Links zur Cloudflare-Konsole für jede Domain

### 2. DNS-Verwaltung
**Funktionen:**
- DNS-Einträge von Domains erstellen, importieren und editieren
- Verwaltung mehrerer Domains und deren DNS-Einträge
- Direkte Links zu spezifischen DNS-Einträgen in der Cloudflare-Konsole

**API-Dokumentation:**
https://developers.cloudflare.com/api/resources/dns/

**Erwartetes Verhalten:**
- Alle DNS-Einträge einer Domain auflisten (A, AAAA, CNAME, MX, TXT, etc.)
- Neue DNS-Einträge hinzufügen
- Bestehende DNS-Einträge bearbeiten
- DNS-Einträge löschen
- DNS-Einträge von einer anderen Quelle importieren
- Deep-Links zu DNS-Einträgen in Cloudflare generieren

### 3. Rules-Verwaltung
**Funktionen:**
- Alle Regeln pro Domain auflisten
- Mehrere Weiterleitungen (Redirects) pro Domain einrichten
- Direkte Links zu den Regeln in der Cloudflare-Konsole

**API-Dokumentation:**
https://developers.cloudflare.com/api/resources/rules/

**Erwartetes Verhalten:**
- Übersicht aller Page Rules, Redirect Rules, Transform Rules
- Neue Weiterleitungsregeln erstellen
- Bestehende Regeln bearbeiten und löschen
- Deep-Links zu Regeln in der Cloudflare-Konsole

## Benutzer-Interface Anforderungen

### Chat-Interface
- Natürlichsprachige Eingabe für Befehle
- Klare Ausgabe von Ergebnissen und Bestätigungen
- Fehlerbehandlung mit hilfreichen Meldungen
- Vorschläge für häufige Aktionen

### Beispiel-Konversationen
```
User: "Zeige mir alle Domains"
Bot: [Liste der Domains mit Links]

User: "Erstelle einen A-Record für example.com mit IP 192.168.1.1"
Bot: [Bestätigung + Link zum DNS-Eintrag]

User: "Liste alle Weiterleitungen für example.com"
Bot: [Übersicht der Redirect Rules mit Links]
```

## Technologie-Stack (Vorschläge)

- **Frontend:** HTML5, CSS3, JavaScript (vanilla oder React/Vue)
- **API-Client:** Fetch API oder Axios
- **Storage:** localStorage für API-Token
- **UI-Framework:** Optional - Bootstrap, Tailwind CSS oder Material UI

## Implementierungsschritte

1. Basis-HTML-Struktur mit Chat-Interface erstellen
2. API-Token-Management implementieren
3. Cloudflare API-Client-Modul entwickeln
4. Domain-Management-Features implementieren
5. DNS-Management-Features implementieren
6. Rules-Management-Features implementieren
7. Deep-Linking zu Cloudflare-Konsole implementieren
8. Chat-Bot-Logik und natürlichsprachige Verarbeitung
9. Fehlerbehandlung und Validierung
10. Testing und Optimierung

## API-Authentifizierung

```javascript
// Beispiel: API-Request mit Token
const apiToken = localStorage.getItem('cloudflare_api_token');
const headers = {
  'Authorization': `Bearer ${apiToken}`,
  'Content-Type': 'application/json'
};
```

## Sicherheitshinweise

- API-Token niemals in den Code hard-coden
- Token-Eingabe beim ersten Start anfordern
- Option zum Löschen des Tokens anbieten
- Keine Übertragung sensibler Daten an Drittserver
- HTTPS verwenden für alle Verbindungen
