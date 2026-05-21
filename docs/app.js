/* ==========================================================================
   AeroParse Dashboard Core Logic - High-Fidelity Client Application
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Application State
    const state = {
        notams: [],
        aircraftSpecs: {},
        selectedNotamId: null,
        currentFilter: 'all',
        searchQuery: '',
        map: null,
        mapLayers: {}, // Map of notam.id -> Leaflet layers (polygon & marker)
        mapCenter: [19.03, 72.96], // Positioned between VABB and VANM
        mapDefaultZoom: 11
    };

    // DOM Elements
    const elements = {
        tabs: document.querySelectorAll('.nav-btn'),
        tabPanels: document.querySelectorAll('.tab-panel'),
        notamListContainer: document.getElementById('notams-list-container'),
        filterButtons: document.querySelectorAll('.filter-btn'),
        searchInput: document.getElementById('notam-search-input'),
        lastUpdatedText: document.getElementById('last-updated-text'),
        
        // Count badges
        countAll: document.getElementById('count-all'),
        countHigh: document.getElementById('count-high'),
        countMedium: document.getElementById('count-medium'),
        
        // Detail panel elements
        detailViewer: document.getElementById('detail-viewer'),
        detailPriorityBadge: document.getElementById('detail-priority-badge'),
        detailNotamId: document.getElementById('detail-notam-id'),
        detailIcao: document.getElementById('detail-icao'),
        detailPlainText: document.getElementById('detail-plain-text'),
        detailTimeFrom: document.getElementById('detail-time-from'),
        detailTimeTo: document.getElementById('detail-time-to'),
        detailRawText: document.getElementById('detail-raw-text'),
        
        // Aircraft specs elements
        specsSearchInput: document.getElementById('specs-search-input'),
        btnSearchSpecs: document.getElementById('btn-search-specs'),
        specsResultGrid: document.getElementById('specs-result-grid'),
        specsResultDetails: document.getElementById('specs-result-details'),
        valAlt: document.getElementById('val-alt'),
        valTakeoff: document.getElementById('val-takeoff'),
        valLanding: document.getElementById('val-landing'),
        valClimb: document.getElementById('val-climb'),
        valModel: document.getElementById('val-model'),
        valEngine: document.getElementById('val-engine'),
        valWeight: document.getElementById('val-weight'),
        valTemp: document.getElementById('val-temp'),
        
        // API guide elements
        apiUrlPath: document.getElementById('api-url-path')
    };

    // Initialize Leaflet Map
    function initMap() {
        // Create Leaflet map with Dark Matter Carto tile layer
        state.map = L.map('map', {
            zoomControl: true,
            attributionControl: true
        }).setView(state.mapCenter, state.mapDefaultZoom);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(state.map);

        // Customize zoom control positioning
        state.map.zoomControl.setPosition('bottomright');
    }

    // Load Data
    async function loadData() {
        try {
            // Load NOTAMs
            const notamsResponse = await fetch('notams.json');
            if (!notamsResponse.ok) throw new Error('Failed to load NOTAMs');
            state.notams = await notamsResponse.ok ? await notamsResponse.json() : [];
            
            // Set update timestamp based on current time
            updateTimestamp();
            
            // Calculate and display badge counts
            updateCounts();
            
            // Render list & map layers
            renderNotamsList();
            renderMapNotams();
        } catch (error) {
            console.error('Error loading NOTAMs:', error);
            elements.notamListContainer.innerHTML = `
                <div class="loader" style="color: var(--priority-high)">
                    Error loading airspace notices. Check your connection or feed data.
                </div>
            `;
        }

        try {
            // Load Aircraft Specs
            const aircraftResponse = await fetch('aircraft.json');
            if (aircraftResponse.ok) {
                state.aircraftSpecs = await aircraftResponse.json();
            }
        } catch (error) {
            console.error('Error loading aircraft specifications:', error);
        }
    }

    // Update system status timestamp
    function updateTimestamp() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        elements.lastUpdatedText.textContent = `Updated today at ${timeString}`;
    }

    // Update priority counts in Sidebar/Header
    function updateCounts() {
        const counts = {
            all: state.notams.length,
            high: state.notams.filter(n => n.priority === 'HIGH').length,
            medium: state.notams.filter(n => n.priority === 'MEDIUM').length
        };
        
        if (elements.countAll) elements.countAll.textContent = counts.all;
        if (elements.countHigh) elements.countHigh.textContent = counts.high;
        if (elements.countMedium) elements.countMedium.textContent = counts.medium;
    }

    // Date formatting helper (UTC representation)
    function formatDate(isoString) {
        if (!isoString) return 'Permanent (EST)';
        const date = new Date(isoString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC'
        }) + ' UTC';
    }

    // Truncate helper for card preview
    function truncateText(text, maxLength = 80) {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength).trim() + '...';
    }

    // Render NOTAM Sidebar list
    function renderNotamsList() {
        elements.notamListContainer.innerHTML = '';
        
        const filtered = state.notams.filter(notam => {
            // Filter by priority
            if (state.currentFilter !== 'all' && notam.priority.toLowerCase() !== state.currentFilter) {
                return false;
            }
            
            // Filter by search query
            if (state.searchQuery) {
                const query = state.searchQuery.toLowerCase();
                const matchesId = notam.id.toLowerCase().includes(query);
                const matchesLocation = notam.location.toLowerCase().includes(query);
                const matchesText = notam.plain_text.toLowerCase().includes(query);
                const matchesRawText = notam.raw_text.toLowerCase().includes(query);
                return matchesId || matchesLocation || matchesText || matchesRawText;
            }
            
            return true;
        });

        if (filtered.length === 0) {
            elements.notamListContainer.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 30px 10px; font-size: 13px;">
                    No notices found matching current filters.
                </div>
            `;
            return;
        }

        filtered.forEach(notam => {
            const card = document.createElement('div');
            card.className = `notam-card priority-${notam.priority.toLowerCase()}`;
            if (state.selectedNotamId === notam.id) {
                card.classList.add('selected');
            }
            
            card.innerHTML = `
                <div class="notam-card-header">
                    <span class="notam-id-tag">${notam.id}</span>
                    <span class="notam-icao-badge">${notam.location}</span>
                </div>
                <p class="notam-card-summary">${truncateText(notam.plain_text)}</p>
                <div class="notam-card-footer">
                    <span class="notam-qcode">${notam.q_code || 'Q-CODE'}</span>
                    <span class="notam-date">${formatDate(notam.valid_from).split(' ')[0]}</span>
                </div>
            `;

            card.addEventListener('click', () => selectNotam(notam));
            elements.notamListContainer.appendChild(card);
        });
    }

    // Render Geometries and Markers on Leaflet Map
    function renderMapNotams() {
        // Clear existing layers from map
        Object.values(state.mapLayers).forEach(layerGroup => {
            state.map.removeLayer(layerGroup);
        });
        state.mapLayers = {};

        state.notams.forEach(notam => {
            // Check if notam has geometry coordinates
            if (!notam.geometry || !notam.geometry.coordinates || notam.geometry.coordinates.length === 0) {
                return;
            }

            const priorityLower = notam.priority.toLowerCase();
            const colorMap = {
                high: '#ff3d00',
                medium: '#ff9100',
                low: '#00e676'
            };
            const activeColor = colorMap[priorityLower] || '#00e5ff';
            
            const fillOpacityMap = {
                high: 0.15,
                medium: 0.12,
                low: 0.08
            };
            const activeFillOpacity = fillOpacityMap[priorityLower] || 0.1;

            const layerGroup = L.layerGroup();

            // 1. Draw airspace closure/restriction polygon
            const polygonLayer = L.geoJSON(notam.geometry, {
                style: {
                    color: activeColor,
                    weight: priorityLower === 'low' ? 1.5 : 2.5,
                    opacity: 0.8,
                    fillColor: activeColor,
                    fillOpacity: activeFillOpacity,
                    dashArray: priorityLower === 'low' ? null : '5, 5'
                }
            });
            layerGroup.addLayer(polygonLayer);

            // 2. Add custom pulsing marker at the centroid of the restriction area
            try {
                const bounds = polygonLayer.getBounds();
                const center = bounds.getCenter();

                const customIcon = L.divIcon({
                    className: `pulsing-marker-${priorityLower}`,
                    iconSize: [12, 12],
                    iconAnchor: [6, 6]
                });

                const marker = L.marker(center, { icon: customIcon });
                
                // Construct standard Leaflet popup
                const popupContent = `
                    <div style="font-family: 'Outfit', sans-serif; min-width: 180px;">
                        <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: ${activeColor};">
                            ${notam.id} [${notam.location}]
                        </h4>
                        <p style="margin: 0; font-size: 11px; line-height: 1.4; color: #f0f4f8;">
                            ${truncateText(notam.plain_text, 120)}
                        </p>
                        <span style="display: block; font-size: 9px; color: #8a9fc4; margin-top: 6px;">
                            Click notice card for details
                        </span>
                    </div>
                `;
                marker.bindPopup(popupContent, {
                    closeButton: false,
                    offset: L.point(0, -6)
                });

                // Zoom to card on marker click
                marker.on('click', () => {
                    selectNotam(notam);
                });

                layerGroup.addLayer(marker);
            } catch (err) {
                console.warn(`Failed to calculate center bounds for NOTAM ${notam.id}:`, err);
            }

            // Always add layer to map so users see all airspace overlays
            layerGroup.addTo(state.map);
            state.mapLayers[notam.id] = layerGroup;
        });
    }

    // Select and Highlight a specific NOTAM
    function selectNotam(notam) {
        state.selectedNotamId = notam.id;
        
        // Update selection styling on list cards
        const cards = elements.notamListContainer.querySelectorAll('.notam-card');
        cards.forEach((card, idx) => {
            const cardId = card.querySelector('.notam-id-tag').textContent;
            if (cardId === notam.id) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });

        // Display NOTAM Detail view block
        elements.detailViewer.classList.remove('hidden');

        // Set detailed text metrics
        elements.detailNotamId.textContent = notam.id;
        elements.detailIcao.textContent = notam.location;
        elements.detailPlainText.textContent = notam.plain_text;
        elements.detailTimeFrom.textContent = formatDate(notam.valid_from);
        elements.detailTimeTo.textContent = formatDate(notam.valid_to);
        elements.detailRawText.textContent = notam.raw_text;

        // Manage Priority badge state
        elements.detailPriorityBadge.className = `badge priority-${notam.priority.toLowerCase()}`;
        elements.detailPriorityBadge.textContent = notam.priority;

        // Fly Map camera bounds to target geometry
        const layerGroup = state.mapLayers[notam.id];
        if (layerGroup) {
            let bounds = null;
            layerGroup.eachLayer(layer => {
                if (layer instanceof L.Polygon || (layer.getBounds && layer.getBounds().isValid())) {
                    bounds = layer.getBounds();
                }
            });

            if (bounds && bounds.isValid()) {
                state.map.flyToBounds(bounds, {
                    maxZoom: 13,
                    duration: 1.2,
                    padding: [30, 30]
                });
            }
        }
    }

    // Search and Filter Events
    elements.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderNotamsList();
    });

    elements.filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            elements.filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            state.currentFilter = btn.dataset.filter;
            renderNotamsList();
        });
    });

    // Tab switcher logic
    elements.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            elements.tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const targetTabId = tab.dataset.tab;
            elements.tabPanels.forEach(panel => {
                if (panel.id === targetTabId) {
                    panel.classList.add('active');
                } else {
                    panel.classList.remove('active');
                }
            });

            // Leaflet layout recalculation patch for visibility toggling
            if (targetTabId === 'tab-dashboard' && state.map) {
                setTimeout(() => {
                    state.map.invalidateSize();
                }, 100);
            }
        });
    });

    // ==========================================================================
    // Aircraft Specifications Query Handler
    // ==========================================================================
    function searchAircraftSpecs() {
        const rawInput = elements.specsSearchInput.value || '';
        const query = rawInput.trim().toUpperCase();

        if (!query) {
            showSpecsErrorMessage('Please type a valid aircraft model code.');
            return;
        }

        const spec = state.aircraftSpecs[query];
        if (!spec) {
            showSpecsErrorMessage(`Aircraft model "${query}" not found in database. Try B738, A320, C172, or GLF6.`);
            return;
        }

        // Show specs result modules
        elements.specsResultGrid.classList.remove('hidden');
        elements.specsResultDetails.classList.remove('hidden');

        // Map values cleanly
        elements.valAlt.textContent = spec.max_altitude_ft ? spec.max_altitude_ft.toLocaleString() : 'N/A';
        elements.valTakeoff.textContent = spec.runway_takeoff_length_m ? spec.runway_takeoff_length_m.toLocaleString() : 'N/A';
        elements.valLanding.textContent = spec.runway_landing_length_m ? spec.runway_landing_length_m.toLocaleString() : 'N/A';
        elements.valClimb.textContent = spec.climb_limit_rate_fpm ? spec.climb_limit_rate_fpm.toLocaleString() : 'N/A';
        
        elements.valModel.textContent = spec.aircraft_model || 'N/A';
        elements.valEngine.textContent = spec.engine_type || 'N/A';
        elements.valWeight.textContent = spec.weight_variant || 'N/A';
        elements.valTemp.textContent = spec.temp_restriction_c ? `${spec.temp_restriction_c} °C` : 'No restriction';
        
        // Remove error states if active
        removeSpecsError();
    }

    function showSpecsErrorMessage(message) {
        // Hide standard layouts
        elements.specsResultGrid.classList.add('hidden');
        elements.specsResultDetails.classList.add('hidden');
        
        // Remove previous error container if any
        removeSpecsError();

        const errDiv = document.createElement('div');
        errDiv.id = 'specs-error-banner';
        errDiv.className = 'glassmorphism';
        errDiv.style.backgroundColor = 'rgba(255, 61, 0, 0.08)';
        errDiv.style.borderColor = 'rgba(255, 61, 0, 0.2)';
        errDiv.style.padding = '16px';
        errDiv.style.borderRadius = 'var(--border-radius-md)';
        errDiv.style.color = '#ff8a80';
        errDiv.style.fontSize = '14px';
        errDiv.style.textAlign = 'center';
        errDiv.style.marginTop = '20px';
        errDiv.textContent = message;

        elements.btnSearchSpecs.parentElement.after(errDiv);
    }

    function removeSpecsError() {
        const errorBanner = document.getElementById('specs-error-banner');
        if (errorBanner) errorBanner.remove();
    }

    elements.btnSearchSpecs.addEventListener('click', searchAircraftSpecs);
    elements.specsSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchAircraftSpecs();
        }
    });

    // Initialize API Url dynamically
    if (elements.apiUrlPath) {
        const apiFullUrl = window.location.origin + window.location.pathname.replace(/index\.html$/, '') + 'notams.json';
        elements.apiUrlPath.textContent = apiFullUrl;
    }

    // App Initialization bootstrap
    initMap();
    loadData();
});
