# AeroSearch — Skyscanner Flight Search Clone

A premium, fully functional flight search web application modelled on Skyscanner. It features a React Single Page Application (SPA) frontend built with Vite, TypeScript, and Tailwind CSS v4, and a secure backend API proxy deployed as a Cloudflare Worker.

---

## 🏛️ System Architecture

```
   +-----------------------+
   |   Vite + React SPA    |  (Deployed to GitHub Pages)
   |  (TypeScript, Tailwind) |
   +-----------------------+
               |
               | HTTP Requests
               v
   +-----------------------+
   |   Cloudflare Worker   |  (Secures Amadeus API secrets)
   |    (Proxy Server)     |
   +-----------------------+
               |
               | Authenticated API Requests
               v
   +-----------------------+
   | Amadeus Developer API |  (Flight offers & pricing database)
   +-----------------------+
```

*The frontend never communicates with the Amadeus API directly. All requests go through the Cloudflare Worker proxy, which manages OAuth token renewal, caching, and request rates.*

---

## ✨ Features

- **Trip Type Toggle**: Instantly switch between One-way and Round-trip flights.
- **Airport Typeahead**: Debounced (300ms) airport and city location autocomplete inputs.
- **Dynamic Search Details**: Native date pickers, class of travel select, and count controls for up to 9 adults.
- **Cheapest Date Price Calendar**: A horizontal 5-week pricing strip showing surrounding cheaper (green), mid-range (amber), or expensive (red) days.
- **Rich Results Filtering**: Filter flights by stops count, max price slider, departure time of day, and airlines checkbox listings.
- **Multi-criteria Sorting**: Sort flight cards instantly by Cheapest, Fastest, or Best (price-to-time ratio) options.
- **Dark Mode Support**: Styled using Tailwind CSS v4, respecting system-wide `prefers-color-scheme` settings.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
Make sure you have Node.js and NPM/Yarn installed on your machine.

### Setup Instructions

1. **Get Amadeus API Keys**:
   - Register a developer account at [developers.amadeus.com](https://developers.amadeus.com/).
   - Create a Self-Service app and copy your Client ID and Client Secret.

2. **Configure Environment Secrets**:
   - In `/worker/`, copy the example file:
     ```bash
     cp worker/.dev.vars.example worker/.dev.vars
     ```
     Open `worker/.dev.vars` and add your client keys:
     ```env
     AMADEUS_CLIENT_ID=your_client_id_here
     AMADEUS_CLIENT_SECRET=your_client_secret_here
     ```
   - In `/frontend/`, copy the example file:
     ```bash
     cp frontend/.env.local.example frontend/.env.local
     ```

3. **Install dependencies**:
   ```bash
   # Install Worker packages
   cd worker
   npm install

   # Install Frontend packages
   cd ../frontend
   npm install
   ```

4. **Launch Dev Servers**:
   Return to the project root directory and run the dev script:
   ```bash
   cd ..
   ./dev.sh
   ```
   *This launches the Cloudflare Wrangler local environment on `http://localhost:8787` and Vite on `http://localhost:5173`.*

5. **Browse the App**:
   Go to **[http://localhost:5173](http://localhost:5173)** in your browser!

---

## 🛠️ Project Structure

```
├── .github/workflows/    # CI/CD deployment configuration
│   └── deploy.yml        # Automatically deploys frontend to GitHub Pages
├── frontend/             # Vite + React (TypeScript) Application
│   ├── src/
│   │   ├── api/          # Network layer connecting to Cloudflare Worker
│   │   ├── components/   # UI widgets (FlightCard, PriceCalendar, SearchForm, etc.)
│   │   ├── hooks/        # React hooks (useAirportSearch, useFlightSearch)
│   │   ├── pages/        # Main pages (Home, Results)
│   │   ├── types/        # Amadeus responses typings
│   │   ├── utils/        # Parsing and formatting utilities
│   │   └── index.css     # CSS root & Tailwind imports
│   └── vite.config.ts    # Build & asset deployment configuration
├── worker/               # Cloudflare Worker proxy
│   ├── src/
│   │   └── index.ts      # Worker endpoints, OAuth caching, CORS handling
│   ├── wrangler.toml     # Worker project metadata
│   └── package.json
├── dev.sh                # Launcher script for parallel dev servers
└── README.md
```

---

## 📖 Additional Docs

- Refer to [SETUP.md](file:///Users/ankitsingh/Desktop/NOTAM%202.0/SETUP.md) for more details on setup and production deployment.
- Refer to [GEMINI.md](file:///Users/ankitsingh/Desktop/NOTAM%202.0/GEMINI.md) for data constraints, rate limits, and known Amadeus quirks.
