# AeroSearch Project Knowledge Base

This file documents the key architecture, rate limits, configurations, and Amadeus API quirks to keep in mind when supporting or extending the Skyscanner Clone application.

---

## 🏛️ Architecture Summary

```
+----------------------------------------+
|               React SPA                |
|           (Vite + TypeScript)          |
|      Hosted on: GitHub Pages (Static)  |
+----------------------------------------+
                    |
          1. HTTPS Request (VITE_API_BASE)
                    v
+----------------------------------------+
|          Cloudflare Worker             |
|          (flight-search-proxy)         |
|   OAuth cached (1799s), CORS headers   |
+----------------------------------------+
                    |
          2. HTTPS Proxied API Call
                    v
+----------------------------------------+
|             Amadeus API                |
|      (Self-Service Developer Tier)     |
+----------------------------------------+
```

### Key Decisions
- **Token Cache**: The worker caches the Amadeus OAuth access token in a module-level variable (`let cachedToken`). Since Cloudflare Worker isolates are reused between requests in the same region, the token remains cached for multiple queries. A 30-second buffer is subtracted from the expiry timestamp to avoid serving stale tokens.
- **SPA Routing Hack**: Because GitHub Pages returns 404 for arbitrary sub-directories (like `/vanm/results` on refresh), we place a `404.html` in the public assets. It caches the requested pathname in `sessionStorage` and redirects back to `/vanm/`. The React app then restores the correct path history dynamically.

---

## 🔑 Environment Variables & Secrets

| Variable Name | Environment | Description | Location |
| :--- | :--- | :--- | :--- |
| `AMADEUS_CLIENT_ID` | Backend (Worker) | Your Amadeus Application API Key | `.dev.vars` (Local) / Wrangler Secret (Prod) |
| `AMADEUS_CLIENT_SECRET` | Backend (Worker) | Your Amadeus Application API Secret | `.dev.vars` (Local) / Wrangler Secret (Prod) |
| `VITE_API_BASE` | Frontend (React) | Public URL of the Cloudflare Worker Proxy | `.env.local` (Local) / GitHub Repository Secret (Prod) |

---

## 🔄 Test vs. Production Environments

By default, this project connects to the **Amadeus Test Environment**:
`https://test.api.amadeus.com`

To migrate to the **Production Environment**:
1. Change the base URLs in `/worker/src/index.ts`:
   - Change `https://test.api.amadeus.com/v1/security/oauth2/token` to `https://api.amadeus.com/v1/security/oauth2/token`
   - Change endpoints starting with `https://test.api.amadeus.com/` to `https://api.amadeus.com/`
2. Update environment secrets in Cloudflare Wrangler to use your Production Client ID and Client Secret:
   ```bash
   npx wrangler secret put AMADEUS_CLIENT_ID
   npx wrangler secret put AMADEUS_CLIENT_SECRET
   ```

---

## 📈 Rate Limits (Amadeus Self-Service API)

| API Service | Test Environment Limit | Production Tier (Free) | Excess Price |
| :--- | :--- | :--- | :--- |
| **Authentication** | Unlimited (Reasonable use) | Unlimited | Free |
| **Flight Offers Search** | 100 requests / month | 2,000 requests / month | €0.025 / request |
| **Flight Cheapest Date** | 100 requests / month | 3,000 requests / month | €0.015 / request |
| **Flight Inspiration Search** | 100 requests / month | 3,000 requests / month | €0.015 / request |

---

## ⚠️ Known Amadeus Quirks & Constraints

1. **Test Data Coverage**:
   The Amadeus test database does NOT mirror live flights globally. Only flights involving specific city/airport pairs are indexed. If you search for unsupported routes, the API returns empty arrays or 400 errors.
   *Reliable test routes include:*
   - `MAD` (Madrid) <-> `NYC` (New York)
   - `LON` (London) <-> `NYC` (New York)
   - `PAR` (Paris) <-> `NYC` (New York)
   - `MAD` <-> `MUC` (Munich)
2. **Inspiration Search Origin**:
   Calling inspiration search (`/v1/shopping/flight-destinations`) works with European origins like `MAD` (Madrid) or `PAR` (Paris) but is highly constrained or empty for Asian hubs like `BOM` (Mumbai) in the test tier. The frontend handles this by falling back to a set of mock destination cards if the BOM search query fails.
3. **Future Dates**:
   All departure and return search dates MUST be set in the future. Searching for past dates results in a `400 Bad Request` error.
4. **Passenger Limits**:
   The `adults` field only accepts values between **1** and **9** inclusive. The passenger dropdown selector strictly limits input increments to these bounds.
