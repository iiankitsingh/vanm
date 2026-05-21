// Preset NOTAM data for the playground
const PRESETS = {
    "icao-rwy": `Q) KZNY/QMRLC/IV/NBO/A/000/999/4063N07377W005
A) KJFK B) 2605212200 C) 2605220600
E) RWY 04L/22R CLSD FOR MAINT.`,

    "faa-tfr": `!FDC 3/9412 ZNY NY.. TEMPORARY FLIGHT RESTRICTIONS EFFECTIVE 2605212200 UTC UNTIL 2605220600 UTC. CIRCLE RADIUS 5NM OF 4075N07399W. PURSUANT TO 14 CFR SECTION 91.141.`,

    "faa-ad": `!DCA 05/123 DCA AD AP CLSD MON-FRI 1400-2200`,

    "icao-tfr-radial": `Q) KZNY/QRTCA/IV/BO/W/000/050/4055N07412W010
A) KEWR B) 2605211200 C) 2605212000
E) TEMPORARY FLIGHT RESTRICTION ACTIVE 10NM SW OF KEWR FOR UAS OPERATIONS.`
};

// Global variables
let map;
let mapLayers = [];

// Initialize Map
function initMap() {
    // Center initially around JFK Airport
    map = L.map('map').setView([40.6397, -73.7789], 10);
    
    // Add premium Dark Matter tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);
}

// Clear Map Layers
function clearMapLayers() {
    mapLayers.forEach(layer => map.removeLayer(layer));
    mapLayers = [];
}

// Add GeoJSON to Map with styled design
function plotGeometry(geometry, notam) {
    if (!geometry) return;
    
    const coords = JSON.parse(geometry.coordinatesJson);
    const type = geometry.type;
    
    let color = '#00e5ff'; // Default Cyan
    let fillColor = 'rgba(0, 229, 255, 0.15)';
    
    if (notam.priority === 'HIGH') {
        color = '#ef4444'; // Red
        fillColor = 'rgba(239, 68, 68, 0.15)';
    } else if (notam.priority === 'EMERGENCY') {
        color = '#ff9100'; // Amber/Orange
        fillColor = 'rgba(255, 145, 0, 0.15)';
    }
    
    let leafletLayer;
    
    if (type === 'Point') {
        const [lon, lat] = coords;
        // Draw a glowing marker dot
        leafletLayer = L.circleMarker([lat, lon], {
            radius: 8,
            fillColor: color,
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(map);
        
        leafletLayer.bindPopup(`<b>${notam.id}</b><br>${notam.plainText}`);
        mapLayers.push(leafletLayer);
        map.setView([lat, lon], 12);
        
    } else if (type === 'Polygon') {
        // GeoJSON coordinates are [[lon, lat], [lon, lat], ...]
        // Leaflet expects [[lat, lon], [lat, lon], ...]
        const latLons = coords[0].map(c => [c[1], c[0]]);
        
        leafletLayer = L.polygon(latLons, {
            color: color,
            weight: 2,
            fillColor: color,
            fillOpacity: 0.15,
            dashArray: notam.priority === 'HIGH' ? '6, 6' : null
        }).addTo(map);
        
        leafletLayer.bindPopup(`<b>${notam.id}</b><br>${notam.plainText}`);
        mapLayers.push(leafletLayer);
        
        // Fit map bounds to show polygon
        map.fitBounds(leafletLayer.getBounds(), { padding: [50, 50] });
    }
}

// Query all seeded NOTAMs on startup
async function fetchSeededNotams() {
    const query = `
        query {
            allNotams {
                id
                qCode
                rawText
                location
                validFrom
                validTo
                plainText
                affectedAerodromes
                priority
                geometry {
                    type
                    coordinatesJson
                }
            }
        }
    `;
    
    try {
        const response = await fetch('/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        const result = await response.json();
        if (result.data && result.data.allNotams) {
            result.data.allNotams.forEach(notam => {
                if (notam.geometry) {
                    plotGeometry(notam.geometry, notam);
                }
            });
        }
    } catch (e) {
        console.error("Error fetching initial NOTAMs:", e);
    }
}

// Parse Raw NOTAM via Mutation
async function parseAndPlot(rawText) {
    if (!rawText.trim()) return;
    
    const mutation = `
        mutation Parse($text: String!) {
            parseRawNotam(rawText: $text) {
                id
                qCode
                rawText
                location
                validFrom
                validTo
                plainText
                affectedAerodromes
                priority
                geometry {
                    type
                    coordinatesJson
                }
            }
        }
    `;
    
    try {
        const response = await fetch('/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: mutation,
                variables: { text: rawText }
            })
        });
        
        const result = await response.json();
        
        if (result.errors) {
            document.getElementById('translation-output').innerText = "Error parsing NOTAM: " + result.errors[0].message;
            return;
        }
        
        const notam = result.data.parseRawNotam;
        
        // Update UI panels
        updateResultUI(notam);
        
        // Plot on Map
        if (notam.geometry) {
            plotGeometry(notam.geometry, notam);
        }
        
    } catch (error) {
        console.error(error);
        document.getElementById('translation-output').innerText = "Failed to communicate with GraphQL server.";
    }
}

// Update Result Tabs UI
function updateResultUI(notam) {
    // 1. Plain English
    document.getElementById('translation-output').innerText = notam.plainText;
    
    const priorityBadge = document.getElementById('notam-priority');
    priorityBadge.innerText = notam.priority;
    priorityBadge.className = 'badge ' + notam.priority.toLowerCase();
    
    const locBadge = document.getElementById('notam-loc-badge');
    locBadge.innerText = notam.location || 'GLOBAL';
    
    document.getElementById('time-from').innerText = notam.validFrom ? notam.validFrom.replace('T', ' ').replace('Z', '') : 'Immediate';
    document.getElementById('time-to').innerText = notam.validTo ? notam.validTo.replace('T', ' ').replace('Z', '') : 'Permanent';
    
    // 2. Structured JSON
    document.getElementById('json-output').innerText = JSON.stringify(notam, null, 2);
    
    // 3. Metadata
    document.getElementById('meta-id').innerText = notam.id;
    document.getElementById('meta-qcode').innerText = notam.qCode || 'N/A';
    document.getElementById('meta-aerodromes').innerText = notam.affectedAerodromes.join(', ') || 'N/A';
    document.getElementById('meta-geom').innerText = notam.geometry ? notam.geometry.type : 'None';
}

// Search Aircraft limitations
async function searchAircraftSpecs(model) {
    if (!model.trim()) return;
    
    const query = `
        query Search($model: String!) {
            aircraftLimitations(model: $model) {
                aircraftModel
                engineType
                weightVariant
                maxAltitudeFt
                runwayTakeoffLengthM
                runwayLandingLengthM
                climbLimitRateFpm
                tempRestrictionC
            }
        }
    `;
    
    try {
        const response = await fetch('/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                variables: { model }
            })
        });
        const result = await response.json();
        const lim = result.data.aircraftLimitations;
        
        const panel = document.getElementById('aircraft-result-panel');
        
        if (lim) {
            panel.classList.remove('hidden');
            document.getElementById('spec-alt').innerText = lim.maxAltitudeFt ? lim.maxAltitudeFt.toLocaleString() : 'N/A';
            document.getElementById('spec-takeoff').innerText = lim.runwayTakeoffLengthM ? lim.runwayTakeoffLengthM.toLocaleString() : 'N/A';
            document.getElementById('spec-landing').innerText = lim.runwayLandingLengthM ? lim.runwayLandingLengthM.toLocaleString() : 'N/A';
            document.getElementById('spec-climb').innerText = lim.climbLimitRateFpm ? lim.climbLimitRateFpm.toLocaleString() : 'N/A';
            document.getElementById('spec-engine').innerText = lim.engineType || 'N/A';
            document.getElementById('spec-weight').innerText = lim.weightVariant || 'N/A';
            document.getElementById('spec-temp').innerText = lim.tempRestrictionC ? lim.tempRestrictionC + ' °C' : 'N/A';
        } else {
            panel.classList.add('hidden');
            alert(`Aircraft model "${model}" not found in database. Try C172, B738, A320, or GLF6.`);
        }
    } catch (e) {
        console.error(e);
        alert("Failed to search aircraft specs.");
    }
}

// Listen to WebSocket subscription for real-time broadcasts
function initWebSocketSubscription() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/graphql`;
    
    const socket = new WebSocket(wsUrl, 'graphql-ws');
    
    socket.onopen = () => {
        // Initialize connection
        socket.send(JSON.stringify({ type: 'connection_init', payload: {} }));
    };
    
    socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        
        if (msg.type === 'connection_ack') {
            // Subscribe to notamAdded
            socket.send(JSON.stringify({
                id: '1',
                type: 'start',
                payload: {
                    query: `
                        subscription {
                            notamAdded {
                                id
                                qCode
                                plainText
                                priority
                                geometry {
                                    type
                                    coordinatesJson
                                }
                            }
                        }
                    `
                }
            }));
        }
        
        if (msg.type === 'data' && msg.payload.data && msg.payload.data.notamAdded) {
            const liveNotam = msg.payload.data.notamAdded;
            // Highlight live ingestion by plotting it
            if (liveNotam.geometry) {
                plotGeometry(liveNotam.geometry, liveNotam);
            }
        }
    };
    
    socket.onerror = (err) => {
        console.warn("WebSocket subscription error, fallback to HTTP queries:", err);
    };
}

// Setup Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    fetchSeededNotams();
    initWebSocketSubscription();
    
    // Preset selector change handler
    const selectPreset = document.getElementById('notam-presets');
    const inputArea = document.getElementById('notam-input');
    
    selectPreset.addEventListener('change', () => {
        const val = selectPreset.value;
        if (val && PRESETS[val]) {
            inputArea.value = PRESETS[val];
        }
    });
    
    // Parse button handler
    document.getElementById('btn-parse').addEventListener('click', () => {
        parseAndPlot(inputArea.value);
    });
    
    // Clear button handler
    document.getElementById('btn-clear').addEventListener('click', () => {
        inputArea.value = '';
        selectPreset.value = '';
        clearMapLayers();
        document.getElementById('translation-output').innerText = "Parsed translation will appear here...";
        document.getElementById('json-output').innerText = '{ "status": "Waiting for input..." }';
        document.getElementById('time-from').innerText = '-';
        document.getElementById('time-to').innerText = '-';
        document.getElementById('meta-id').innerText = '-';
        document.getElementById('meta-qcode').innerText = '-';
        document.getElementById('meta-aerodromes').innerText = '-';
        document.getElementById('meta-geom').innerText = '-';
        
        // Re-plot seeded ones
        fetchSeededNotams();
    });
    
    // Tab switching handler
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Sidebar navigation handler
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Switch active sections
            const targetHash = item.getAttribute('href');
            document.querySelectorAll('.section-content').forEach(s => s.classList.remove('active'));
            
            if (targetHash === '#playground') {
                document.getElementById('playground-section').classList.add('active');
            } else if (targetHash === '#graphql') {
                document.getElementById('graphql-section').classList.add('active');
            } else if (targetHash === '#aircraft') {
                document.getElementById('aircraft-section').classList.add('active');
            }
        });
    });
    
    // Aircraft search handler
    const searchInput = document.getElementById('aircraft-search-input');
    document.getElementById('btn-search-aircraft').addEventListener('click', () => {
        searchAircraftSpecs(searchInput.value);
    });
});
