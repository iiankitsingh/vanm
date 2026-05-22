# 📡 AeroRadar | Real-Time Client-Side Flight Tracker

A sleek, premium, real-time Flightradar24-style tracking web application centered on Navi Mumbai, India (Lat: 19.033, Lon: 73.029).

This app runs **100% client-side** using only HTML, CSS, and Vanilla JavaScript, making it perfect for hosting directly on **GitHub Pages**.

Deployed live on GitHub Pages: **[https://iiankitsingh.github.io/vanm/](https://iiankitsingh.github.io/vanm/)**

---

## ✨ Features

- **Interactive Dark Map**: Uses Leaflet.js and CartoDB Dark Matter tile layer to render an ATC-themed dark radar map.
- **Airplanes.Live Integration**: Connects to the unfiltered Airplanes.Live REST API directly from the browser, retrieving aircraft vectors within a 250 nautical mile radius.
- **Smooth Coordinate Glide Interpolation**: Instead of planes jumping every 4 seconds, a `requestAnimationFrame` loop calculates linear position transitions, making airplanes glide smoothly across the screen at 60 FPS.
- **Shortest-Path Angle Wrapping**: Smoothly interpolates headings (tracks) so plane icons rotate naturally when wrapping around the 360-degree boundary.
- **Custom Aircraft Vector Icons**: Uses a custom-rotated SVG airplane silhouette styled with CSS glow effects (cyan for active, yellow for highlighted/selected plane).
- **Glassmorphic HUD Elements**: Features a premium top-right counter displaying the count of live aircraft and custom dark popups revealing Callsign, Registration, Aircraft Type, Altitude, and Speed.

---

## 🚀 How to Run Locally

Since the app is fully self-contained in a single file:
1. Double-click `index.html` to open it directly in any browser.
2. Alternatively, spin up a quick local web server:
   ```bash
   python3 -m http.server 8080
   ```
3. Open **[http://localhost:8080](http://localhost:8080)** in your browser.

---

## 🛠️ Project Structure

- `index.html`: Holds the entire application structure, styling (CSS overrides for custom dark popups, transitions, and layout), and interactive JavaScript (smooth physics, shortest-path rotation, API polling, and Leaflet binding).
