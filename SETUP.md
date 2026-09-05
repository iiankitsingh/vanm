# Setup Guide — AeroSearch (Skyscanner Clone)

Follow these step-by-step instructions to get your local development environment running.

## 🛠️ Step 1: Get Amadeus API Keys
1. Go to the [Amadeus for Developers Portal](https://developers.amadeus.com/).
2. Create a free developer account or sign in.
3. Navigate to **My Self-Service Workspace** > **My Apps**.
4. Click **Create New App**, name it (e.g. `AeroSearch`), and click **Create**.
5. Copy your **API Key** (Client ID) and **API Secret** (Client Secret).

---

## 🔑 Step 2: Configure Environment Variables

### 1. Backend Secrets (Worker)
Duplicate the worker dev vars template in `/worker`:
```bash
cp worker/.dev.vars.example worker/.dev.vars
```
Open `worker/.dev.vars` in your editor and replace the placeholder values with your Amadeus keys:
```env
AMADEUS_CLIENT_ID=your_actual_client_id_here
AMADEUS_CLIENT_SECRET=your_actual_client_secret_here
```

### 2. Frontend Config
Duplicate the frontend env template in `/frontend`:
```bash
cp frontend/.env.local.example frontend/.env.local
```
*(By default, this points `VITE_API_BASE` to your local Wrangler Worker server at `http://localhost:8787`)*.

---

## 📦 Step 3: Install Dependencies

Run package installs in both the backend and frontend directories:
```bash
# Install Worker dependencies
cd worker
npm install

# Install Frontend dependencies
cd ../frontend
npm install
```

---

## 🚀 Step 4: Run the App Locally

Return to the project root directory and execute the dev script:
```bash
cd ..
./dev.sh
```
This script will boot:
- The Cloudflare Wrangler dev server on **`http://localhost:8787`**
- The Vite React dev server on **`http://localhost:5173`**

Open **[http://localhost:5173](http://localhost:5173)** in your web browser to test the application!

---

## 🌐 Step 5: Deploying to Production

### 1. Deploy the Cloudflare Worker Backend
Ensure you have the Wrangler CLI logged in, then run:
```bash
cd worker
npx wrangler deploy
```
After deployment, write down your worker's live public URL (e.g., `https://flight-search-proxy.your-username.workers.dev`).
Set your credentials as production secrets on Cloudflare:
```bash
npx wrangler secret put AMADEUS_CLIENT_ID
npx wrangler secret put AMADEUS_CLIENT_SECRET
```

### 2. Deploy the Vite React Frontend (GitHub Pages)
1. Add the GitHub Pages deploy action to your repository.
2. In your GitHub Repository settings, go to **Settings** > **Secrets and variables** > **Actions**.
3. Create a repository secret named `VITE_API_BASE` and set it to your deployed Cloudflare Worker's public URL (e.g., `https://flight-search-proxy.your-username.workers.dev`).
4. Commit and push your changes to the `main` branch. GitHub Actions will build and deploy the SPA to the `gh-pages` branch.
