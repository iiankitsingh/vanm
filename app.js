/* ==========================================================================
   AeroRadar Dashboard Core Logic - High-Fidelity Client Application
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Application State
    const state = {
        flights: [],
        selectedFlightId: null,
        currentTab: 'tab-map',
        searchQuery: '',
        airportFilter: 'all',
        map: null,
        markers: {},      // Map of icao24 -> Leaflet marker
        airportLayers: [], // Reference to static airport circles
        selectedTrail: null, // Active flight path polyline
        mapCenter: [19.03, 72.96],
        mapDefaultZoom: 11
    };

    // Airplane SVG raw markup
    const PLANE_SVG = `
    <svg class="airplane-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
    </svg>`;

    // DOM Elements
    const elements = {
        tabs: document.querySelectorAll('.nav-btn'),
        tabPanels: document.querySelectorAll('.tab-panel'),
        searchInput: document.getElementById('flight-search-input'),
        filterButtons: document.querySelectorAll('.filter-btn'),
        lastUpdatedText: document.getElementById('last-updated-text'),
        
        // Count tags
        arrivalsCount: document.getElementById('arrivals-count'),
        departuresCount: document.getElementById('departures-count'),
        groundCount: document.getElementById('ground-count'),

        // Telemetry details panel
        detailViewer: document.getElementById('detail-viewer'),
        closeTelemetryBtn: document.getElementById('close-telemetry-btn'),
        detailStatusBadge: document.getElementById('detail-status-badge'),
        detailCallsign: document.getElementById('detail-callsign'),
        detailLogo: document.getElementById('detail-logo'),
        detailAirline: document.getElementById('detail-airline'),
        detailModel: document.getElementById('detail-model'),
        detailOrigin: document.getElementById('detail-origin'),
        detailDestination: document.getElementById('detail-destination'),
        detailAltitude: document.getElementById('detail-altitude'),
        detailSpeed: document.getElementById('detail-speed'),
        detailHeading: document.getElementById('detail-heading'),
        detailVrate: document.getElementById('detail-vrate'),
        detailLat: document.getElementById('detail-lat'),
        detailLon: document.getElementById('detail-lon'),
        detailSquawk: document.getElementById('detail-squawk'),
        detailIcao24: document.getElementById('detail-icao24'),
        detailGate: document.getElementById('detail-gate'),
        detailGateContainer: document.getElementById('detail-gate-container'),
        
        // Enriched metadata fields
        detailPhotoImg: document.getElementById('detail-photo-img'),
        detailPhotoCredit: document.getElementById('detail-photo-credit'),
        detailAircraftFullname: document.getElementById('detail-aircraft-fullname'),
        detailOriginFull: document.getElementById('detail-origin-full'),
        detailDestinationFull: document.getElementById('detail-destination-full'),
        detailDepTime: document.getElementById('detail-dep-time'),
        detailArrTime: document.getElementById('detail-arr-time'),
        detailProgressFill: document.getElementById('detail-progress-fill'),
        detailProgressPlane: document.getElementById('detail-progress-plane'),
        detailProgressPercent: document.getElementById('detail-progress-percent'),
        detailRegistration: document.getElementById('detail-registration'),
        detailSerial: document.getElementById('detail-serial'),
        detailAge: document.getElementById('detail-age'),
        detailManufacturer: document.getElementById('detail-manufacturer'),
        detailEngines: document.getElementById('detail-engines'),

        // Tables
        arrivalsTableBody: document.querySelector('#arrivals-table tbody'),
        departuresTableBody: document.querySelector('#departures-table tbody'),
        groundTableBody: document.querySelector('#ground-table tbody')
    };

    // Initialize Map and Airport Rings
    function initMap() {
        state.map = L.map('map', {
            zoomControl: true,
            attributionControl: true
        }).setView(state.mapCenter, state.mapDefaultZoom);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(state.map);

        state.map.zoomControl.setPosition('bottomright');

        // Draw static runway indicators
        const vabbRunway = L.circle([19.0896, 72.8656], {
            color: 'rgba(0, 229, 255, 0.4)',
            fillColor: 'rgba(0, 229, 255, 0.05)',
            fillOpacity: 0.1,
            weight: 1.5,
            dashArray: '3, 6',
            radius: 1800
        }).addTo(state.map).bindTooltip("Mumbai CSMIA (VABB) Control Zone", { sticky: true, className: 'airplane-tooltip' });

        const vanmRunway = L.circle([18.9919, 73.0617], {
            color: 'rgba(0, 230, 118, 0.4)',
            fillColor: 'rgba(0, 230, 118, 0.05)',
            fillOpacity: 0.1,
            weight: 1.5,
            dashArray: '3, 6',
            radius: 1800
        }).addTo(state.map).bindTooltip("Navi Mumbai (VANM) Control Zone", { sticky: true, className: 'airplane-tooltip' });

        state.airportLayers = [vabbRunway, vanmRunway];
    }

    // Load Data
    async function loadData(isInterval = false) {
        try {
            const response = await fetch('flights.json?nocache=' + new Date().getTime());
            if (!response.ok) throw new Error('Data fetch issue');
            state.flights = await response.json();
            
            updateTimestamp();
            updateFIDSCounts();
            renderFIDSBoards();
            renderRadarMapMarkers();

            // Refresh selected flight telemetry details if panel is open
            if (state.selectedFlightId) {
                const flight = state.flights.find(f => f.icao24 === state.selectedFlightId);
                if (flight) {
                    updateTelemetryPanel(flight);
                } else {
                    closeTelemetry();
                }
            }
        } catch (error) {
            console.error('Error loading flight tracking telemetry:', error);
            if (!isInterval) {
                const errRow = `<tr><td colspan="7" class="table-empty" style="color: var(--accent-red)">Failed to contact radar feed. Check local status.</td></tr>`;
                elements.arrivalsTableBody.innerHTML = errRow;
                elements.departuresTableBody.innerHTML = errRow;
                elements.groundTableBody.innerHTML = errRow;
            }
        }
    }

    // Update refresh timestamp status
    function updateTimestamp() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        elements.lastUpdatedText.textContent = `Refresh: ${timeString} • ${state.flights.length} Targets`;
    }

    // Filter Helper logic
    function getFilteredFlights() {
        return state.flights.filter(f => {
            // Airport filter VABB/VANM
            if (state.airportFilter !== 'all' && f.airport !== state.airportFilter) {
                return false;
            }
            
            // Search query text match
            if (state.searchQuery) {
                const query = state.searchQuery.toLowerCase();
                const matchesCallsign = f.callsign.toLowerCase().includes(query);
                const matchesAirline = f.airline.toLowerCase().includes(query);
                const matchesOrigin = f.origin.toLowerCase().includes(query);
                const matchesDest = f.destination.toLowerCase().includes(query);
                const matchesModel = f.model.toLowerCase().includes(query);
                return matchesCallsign || matchesAirline || matchesOrigin || matchesDest || matchesModel;
            }
            
            return true;
        });
    }

    // Update Counts tags
    function updateFIDSCounts() {
        const filtered = getFilteredFlights();
        const arrivals = filtered.filter(f => f.type === 'arrival');
        const departures = filtered.filter(f => f.type === 'departure');
        const ground = filtered.filter(f => f.type === 'on_ground');

        elements.arrivalsCount.textContent = `${arrivals.length} Flights Active`;
        elements.departuresCount.textContent = `${departures.length} Flights Active`;
        elements.groundCount.textContent = `${ground.length} Aircraft Active`;
    }

    // Format metrics helpers
    function formatAltitude(alt) {
        if (alt === 0) return 'GND';
        return alt.toLocaleString() + ' ft';
    }

    function formatSpeed(speed) {
        if (speed === 0) return '---';
        return speed + ' kts';
    }

    // Render airport flight boards (FIDS)
    function renderFIDSBoards() {
        const filtered = getFilteredFlights();

        // 1. ARRIVALS
        const arrivals = filtered.filter(f => f.type === 'arrival');
        if (arrivals.length === 0) {
            elements.arrivalsTableBody.innerHTML = `<tr><td colspan="7" class="table-empty">No active arrivals matching criteria.</td></tr>`;
        } else {
            elements.arrivalsTableBody.innerHTML = arrivals.map(f => `
                <tr class="${state.selectedFlightId === f.icao24 ? 'selected-row' : ''}">
                    <td><strong>${f.callsign}</strong></td>
                    <td>${f.logo} ${f.airline}</td>
                    <td>${f.origin}</td>
                    <td>${formatAltitude(f.altitude)}</td>
                    <td>${formatSpeed(f.speed)}</td>
                    <td><span class="status-pill ${f.status.toLowerCase().replace(' ', '-')}">${f.status}</span></td>
                    <td><button class="track-btn" data-icao="${f.icao24}">Track</button></td>
                </tr>
            `).join('');
        }

        // 2. DEPARTURES
        const departures = filtered.filter(f => f.type === 'departure');
        if (departures.length === 0) {
            elements.departuresTableBody.innerHTML = `<tr><td colspan="7" class="table-empty">No active departures matching criteria.</td></tr>`;
        } else {
            elements.departuresTableBody.innerHTML = departures.map(f => `
                <tr class="${state.selectedFlightId === f.icao24 ? 'selected-row' : ''}">
                    <td><strong>${f.callsign}</strong></td>
                    <td>${f.logo} ${f.airline}</td>
                    <td>${f.destination}</td>
                    <td>${formatAltitude(f.altitude)}</td>
                    <td>${formatSpeed(f.speed)}</td>
                    <td><span class="status-pill ${f.status.toLowerCase().replace(' ', '-')}">${f.status}</span></td>
                    <td><button class="track-btn" data-icao="${f.icao24}">Track</button></td>
                </tr>
            `).join('');
        }

        // 3. GROUND TRAFFIC
        const ground = filtered.filter(f => f.type === 'on_ground');
        if (ground.length === 0) {
            elements.groundTableBody.innerHTML = `<tr><td colspan="7" class="table-empty">No aircraft on ground.</td></tr>`;
        } else {
            elements.groundTableBody.innerHTML = ground.map(f => `
                <tr class="${state.selectedFlightId === f.icao24 ? 'selected-row' : ''}">
                    <td><strong>${f.callsign}</strong></td>
                    <td>${f.logo} ${f.airline}</td>
                    <td>${f.model}</td>
                    <td>${f.destination === 'En Route' ? 'Scheduled' : f.destination}</td>
                    <td><span style="font-family: 'Fira Code', monospace; color: var(--accent-cyan)">${f.gate || 'APRON'}</span></td>
                    <td><span class="status-pill landed">${f.status}</span></td>
                    <td><button class="track-btn" data-icao="${f.icao24}">Track</button></td>
                </tr>
            `).join('');
        }

        // Attach event listeners to all newly rendered "Track" buttons
        document.querySelectorAll('.track-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const icao = btn.dataset.icao;
                const flight = state.flights.find(f => f.icao24 === icao);
                if (flight) {
                    // Activate Radar tab
                    elements.tabs[0].click();
                    // Select flight
                    selectFlight(flight);
                }
            });
        });
    }

    // Render Flight Markers & Trails on Leaflet Map
    function renderRadarMapMarkers() {
        const filtered = getFilteredFlights();
        const currentIcaos = new Set(filtered.map(f => f.icao24));

        // 1. Remove markers for flights no longer visible
        Object.keys(state.markers).forEach(icao => {
            if (!currentIcaos.has(icao)) {
                state.map.removeLayer(state.markers[icao]);
                delete state.markers[icao];
            }
        });

        // 2. Add or update current flight markers
        filtered.forEach(flight => {
            const isSelected = state.selectedFlightId === flight.icao24;
            const statusClass = flight.status.toLowerCase().replace(' ', '-');
            const routeText = (flight.origin_iata && flight.destination_iata)
                ? `${flight.origin_iata} ➔ ${flight.destination_iata}`
                : (flight.type === 'on_ground' ? 'GND' : 'BOM ➔ DEL');
            
            // Build DivIcon airplane element with outer wrapper for label and inner wrapper for rotation
            const customIcon = L.divIcon({
                className: 'airplane-marker' + (isSelected ? ' selected' : ''),
                html: `
                    <div class="airplane-marker-container status-${statusClass}">
                        <div class="airplane-marker-wrapper" style="transform: rotate(${flight.heading}deg)">
                            ${PLANE_SVG}
                        </div>
                        <div class="airplane-marker-label">
                            <span class="label-callsign">${flight.callsign}</span>
                            <span class="label-route">${routeText}</span>
                        </div>
                    </div>
                `,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });

            if (state.markers[flight.icao24]) {
                // Update marker coordinates, icon and rotation
                const marker = state.markers[flight.icao24];
                marker.setLatLng([flight.lat, flight.lon]);
                marker.setIcon(customIcon);
                
                // Update tooltip text
                marker.getTooltip().setContent(`<strong>${flight.callsign}</strong><br>${routeText}<br>${formatAltitude(flight.altitude)}`);
            } else {
                // Create new marker
                const marker = L.marker([flight.lat, flight.lon], { icon: customIcon })
                    .addTo(state.map)
                    .bindTooltip(`<strong>${flight.callsign}</strong><br>${routeText}<br>${formatAltitude(flight.altitude)}`, {
                        direction: 'top',
                        offset: [0, -10],
                        className: 'airplane-tooltip',
                        permanent: false
                    });

                // Attach click handler
                marker.on('click', () => {
                    selectFlight(flight);
                });

                state.markers[flight.icao24] = marker;
            }
        });

        // 3. Update active flight trail if a selected flight is being tracked
        renderSelectedFlightTrail();
    }

    // Render selected flight historical trail
    function renderSelectedFlightTrail() {
        // Clear old trail
        if (state.selectedTrail) {
            state.map.removeLayer(state.selectedTrail);
            state.selectedTrail = null;
        }

        if (!state.selectedFlightId) return;

        const flight = state.flights.find(f => f.icao24 === state.selectedFlightId);
        if (flight && flight.trail && flight.trail.length > 1) {
            const points = flight.trail.map(coord => [coord[1], coord[0]]); // GeoJSON [lon, lat] -> Leaflet [lat, lon]
            
            // Draw path lines
            state.selectedTrail = L.polyline(points, {
                color: 'var(--accent-cyan)',
                weight: 2,
                dashArray: '4, 6',
                opacity: 0.7
            }).addTo(state.map);
        }
    }

    // Select specific Flight
    function selectFlight(flight) {
        state.selectedFlightId = flight.icao24;
        
        // Re-render markers to update selected styles (color/glow)
        renderRadarMapMarkers();
        
        // Populate and open telemetry view
        elements.detailViewer.classList.remove('hidden');
        updateTelemetryPanel(flight);

        // Fly map camera to flight position
        state.map.flyTo([flight.lat, flight.lon], 12, {
            duration: 1.2
        });
    }

    // Populate the flight info details sidebar panel
    function updateTelemetryPanel(flight) {
        // Basic Info
        elements.detailCallsign.textContent = flight.callsign;
        elements.detailLogo.textContent = flight.logo;
        elements.detailAirline.textContent = flight.airline;
        elements.detailModel.textContent = flight.model;
        
        // Enriched specification fields
        elements.detailAircraftFullname.textContent = flight.aircraft_fullname || flight.model;
        elements.detailRegistration.textContent = flight.registration || 'N/A';
        elements.detailSerial.textContent = flight.serial_number || 'N/A';
        elements.detailAge.textContent = flight.age || 'N/A';
        elements.detailManufacturer.textContent = flight.manufacturer || 'N/A';
        elements.detailEngines.textContent = flight.engines || 'N/A';
        
        // JetPhotos credit & image binding
        elements.detailPhotoImg.src = flight.photo_url || 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=80';
        elements.detailPhotoCredit.textContent = flight.photographer ? `Photo © ${flight.photographer} / JetPhotos` : 'Photo © JetPhotos';
        
        // Airport Names and schedules
        elements.detailOrigin.textContent = flight.origin_iata || flight.origin.split(' ')[0];
        elements.detailDestination.textContent = flight.destination_iata || flight.destination.split(' ')[0];
        elements.detailOriginFull.textContent = flight.origin_fullname || flight.origin;
        elements.detailDestinationFull.textContent = flight.destination_fullname || flight.destination;
        elements.detailDepTime.textContent = flight.dep_time || '--:--';
        elements.detailArrTime.textContent = flight.arr_time || '--:--';
        
        // Compute and update route progress timeline
        let progressPercent = 0;
        if (flight.type === 'on_ground') {
            progressPercent = 0;
        } else if (flight.dep_time && flight.arr_time) {
            try {
                const [depH, depM] = flight.dep_time.split(':').map(Number);
                const [arrH, arrM] = flight.arr_time.split(':').map(Number);
                
                const depTotalMin = depH * 60 + depM;
                let arrTotalMin = arrH * 60 + arrM;
                
                if (arrTotalMin < depTotalMin) {
                    arrTotalMin += 24 * 60; // overnight flight wrap
                }
                
                const duration = arrTotalMin - depTotalMin;
                
                const now = new Date();
                let currentTotalMin = now.getHours() * 60 + now.getMinutes();
                
                if (currentTotalMin < depTotalMin && arrTotalMin > 24 * 60) {
                    currentTotalMin += 24 * 60;
                }
                
                if (currentTotalMin >= depTotalMin && currentTotalMin <= arrTotalMin) {
                    progressPercent = Math.round(((currentTotalMin - depTotalMin) / duration) * 100);
                } else if (currentTotalMin > arrTotalMin) {
                    progressPercent = 100;
                } else {
                    progressPercent = 30; // En route approximation
                }
            } catch (err) {
                progressPercent = 50;
            }
        }
        
        // Calibrate progress bar position based on flight state
        if (flight.status === 'Final Approach') {
            progressPercent = Math.max(progressPercent, 90);
        } else if (flight.status === 'Descending') {
            progressPercent = Math.max(progressPercent, 70);
        } else if (flight.status === 'Climbing') {
            progressPercent = Math.min(progressPercent, 15);
        } else if (flight.status === 'Departed') {
            progressPercent = Math.min(progressPercent, 30);
        } else if (flight.status === 'Landed') {
            progressPercent = 100;
        }
        
        progressPercent = Math.max(0, Math.min(100, progressPercent));
        elements.detailProgressFill.style.width = `${progressPercent}%`;
        elements.detailProgressPlane.style.left = `${progressPercent}%`;
        
        let progressText = `Flight Progress: ${progressPercent}% complete`;
        if (flight.status === 'Landed') {
            progressText = `Landed at ${flight.arr_time}`;
        } else if (flight.status === 'Boarding' || flight.status === 'Taxiing') {
            progressText = `Departure scheduled at ${flight.dep_time}`;
        }
        elements.detailProgressPercent.textContent = progressText;

        // Coordinates & Telemetry
        elements.detailAltitude.textContent = formatAltitude(flight.altitude);
        elements.detailSpeed.textContent = formatSpeed(flight.speed);
        elements.detailHeading.textContent = `${flight.heading}°`;
        
        // Vertical rate formatting
        const vrate = flight.vertical_rate;
        if (vrate > 100) {
            elements.detailVrate.textContent = `+${vrate.toLocaleString()} fpm`;
            elements.detailVrate.style.color = 'var(--accent-cyan)';
        } else if (vrate < -100) {
            elements.detailVrate.textContent = `${vrate.toLocaleString()} fpm`;
            elements.detailVrate.style.color = 'var(--accent-green)';
        } else {
            elements.detailVrate.textContent = '0 fpm (level)';
            elements.detailVrate.style.color = 'var(--text-secondary)';
        }
        
        elements.detailLat.textContent = flight.lat.toFixed(4);
        elements.detailLon.textContent = flight.lon.toFixed(4);
        elements.detailIcao24.textContent = flight.icao24.toUpperCase();
        
        // Generate pseudo squawk code based on flight ID hex
        const pseudoSquawk = (parseInt(flight.icao24.replace(/[^0-9a-f]/g, ''), 16) % 7000 + 1000).toString();
        elements.detailSquawk.textContent = pseudoSquawk;

        // Gate assignments for ground flights
        if (flight.type === 'on_ground' && flight.gate) {
            elements.detailGateContainer.classList.remove('hidden');
            elements.detailGate.textContent = flight.gate;
        } else {
            elements.detailGateContainer.classList.add('hidden');
        }

        // Manage status badge style
        elements.detailStatusBadge.className = `badge status-${flight.status.toLowerCase().replace(' ', '_')}`;
        elements.detailStatusBadge.textContent = flight.status;
    }

    // Close Telemetry panel viewer
    function closeTelemetry() {
        state.selectedFlightId = null;
        elements.detailViewer.classList.add('hidden');
        
        if (state.selectedTrail) {
            state.map.removeLayer(state.selectedTrail);
            state.selectedTrail = null;
        }
        
        renderRadarMapMarkers();
    }

    // Close btn click listener
    elements.closeTelemetryBtn.addEventListener('click', closeTelemetry);

    // Event listener: Search Queries
    elements.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        updateFIDSCounts();
        renderFIDSBoards();
        renderRadarMapMarkers();
    });

    // Event listener: Airport Filter Buttons
    elements.filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            state.airportFilter = btn.dataset.airport;
            updateFIDSCounts();
            renderFIDSBoards();
            renderRadarMapMarkers();
        });
    });

    // Event listener: Tab switches
    elements.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            elements.tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const targetTabId = tab.dataset.tab;
            state.currentTab = targetTabId;

            elements.tabPanels.forEach(panel => {
                if (panel.id === targetTabId) {
                    panel.classList.add('active');
                } else {
                    panel.classList.remove('active');
                }
            });

            // Leaflet map refresh when map panel is activated
            if (targetTabId === 'tab-map' && state.map) {
                setTimeout(() => {
                    state.map.invalidateSize();
                }, 80);
            }
        });
    });

    // Initialize map, load telemetry data, and start auto-refresh intervals
    initMap();
    loadData();

    // Auto-refresh flights telemetry data every 10 seconds
    setInterval(() => {
        loadData(true);
    }, 10000);
});
