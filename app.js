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

    // Seedable PRNG & Metadata Databases
    const AIRLINE_MAP = {
        "AIC": { name: "Air India", logo: "🇮🇳" },
        "IGO": { name: "IndiGo", logo: "🔵" },
        "VTI": { name: "Vistara", logo: "🟣" },
        "SEJ": { name: "SpiceJet", logo: "🔴" },
        "AKJ": { name: "Akasa Air", logo: "🟠" },
        "UAE": { name: "Emirates", logo: "🇦🇪" },
        "SIA": { name: "Singapore Airlines", logo: "🇸🇬" },
        "QTR": { name: "Qatar Airways", logo: "🇶🇦" },
        "BAW": { name: "British Airways", logo: "🇬🇧" },
        "LHA": { name: "Lufthansa", logo: "🇩🇪" },
        "ETD": { name: "Etihad Airways", logo: "🇦🇪" },
        "JAI": { name: "Jet Airways", logo: "🇮🇳" }
    };

    const MODEL_DATA = {
        "A20N": {
            name: "Airbus A320-251N (A20N)",
            engines: "2x CFM LEAP-1A26",
            photo_url: "https://images.unsplash.com/photo-1540962351504-03099e0a754b?auto=format&fit=crop&w=600&q=80",
            msn_range: [8500, 11500],
            age_range: [0.5, 6.0]
        },
        "A321": {
            name: "Airbus A321-271NX (A321)",
            engines: "2x PW1133G-JM",
            photo_url: "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?auto=format&fit=crop&w=600&q=80",
            msn_range: [9000, 12000],
            age_range: [0.5, 4.0]
        },
        "B77W": {
            name: "Boeing 777-300ER (B77W)",
            engines: "2x GE GE90-115B",
            photo_url: "https://images.unsplash.com/photo-1606761568499-6d2451b23c66?auto=format&fit=crop&w=600&q=80",
            msn_range: [35000, 43000],
            age_range: [5.0, 12.0]
        },
        "A359": {
            name: "Airbus A350-941 (A359)",
            engines: "2x RR Trent XWB-84",
            photo_url: "https://images.unsplash.com/photo-1517999144091-3d9dca6d1e43?auto=format&fit=crop&w=600&q=80",
            msn_range: [100, 500],
            age_range: [1.0, 8.0]
        },
        "B788": {
            name: "Boeing 787-8 Dreamliner (B788)",
            engines: "2x RR Trent 1000",
            photo_url: "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=600&q=80",
            msn_range: [34000, 39000],
            age_range: [4.0, 10.0]
        },
        "B38M": {
            name: "Boeing 737 MAX 8 (B38M)",
            engines: "2x CFM LEAP-1B27",
            photo_url: "https://images.unsplash.com/photo-1473862170180-84427c485ade?auto=format&fit=crop&w=600&q=80",
            msn_range: [43000, 45000],
            age_range: [0.5, 5.0]
        },
        "GLF6": {
            name: "Gulfstream G650ER (GLF6)",
            engines: "2x RR BR725A1-12",
            photo_url: "https://images.unsplash.com/photo-1527261834078-9b37d35a4a32?auto=format&fit=crop&w=600&q=80",
            msn_range: [6000, 6500],
            age_range: [2.0, 10.0]
        }
    };

    const AIRPORTS = {
        "VABB": { fullname: "Chhatrapati Shivaji Maharaj Intl (BOM/VABB)", city: "Mumbai", iata: "BOM" },
        "VANM": { fullname: "Navi Mumbai International (NMIA/VANM)", city: "Navi Mumbai", iata: "NMIA" },
        "VIDP": { fullname: "Indira Gandhi International (DEL/VIDP)", city: "Delhi", iata: "DEL" },
        "VOBL": { fullname: "Kempegowda International (BLR/VOBL)", city: "Bangalore", iata: "BLR" },
        "VOMM": { fullname: "Chennai International (MAA/VOMM)", city: "Chennai", iata: "MAA" },
        "VOGO": { fullname: "Manohar International (GOX/VOGO)", city: "Goa", iata: "GOX" },
        "VAPO": { fullname: "Pune Airport (PNQ/VAPO)", city: "Pune", iata: "PNQ" },
        "OMDB": { fullname: "Dubai International (DXB/OMDB)", city: "Dubai", iata: "DXB" },
        "WSSS": { fullname: "Singapore Changi (SIN/WSSS)", city: "Singapore", iata: "SIN" },
        "EGLL": { fullname: "London Heathrow (LHR/EGLL)", city: "London", iata: "LHR" },
        "QTR": { fullname: "Doha Hamad International (DOH/OTBD)", city: "Doha", iata: "DOH" },
        "AUH": { fullname: "Abu Dhabi International (AUH/OMAA)", city: "Abu Dhabi", iata: "AUH" }
    };

    // Mulberry32 + cyrb128 string hash implementation for seeded random number generation
    function cyrb128(str) {
        let h1 = 1779033703, h2 = 3024733165, h3 = 3362453659, h4 = 50249321;
        for (let i = 0, k; i < str.length; i++) {
            k = str.charCodeAt(i);
            h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
            h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
            h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
            h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
        }
        h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
        h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
        h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
        h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
        return [(h1^h2^h3^h4)>>>0, (h2^h1)>>>0, (h3^h1)>>>0, (h4^h1)>>>0];
    }

    function mulberry32(a) {
        return function() {
            let t = a += 0x6D2B79F5;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        }
    }

    function getSeededRandom(seedString) {
        const seed = cyrb128(seedString);
        return mulberry32(seed[0]);
    }

    function randomUniform(rng, min, max) {
        return min + rng() * (max - min);
    }

    function randomInt(rng, min, max) {
        return Math.floor(randomUniform(rng, min, max + 1));
    }

    function randomChoice(rng, arr) {
        return arr[Math.floor(rng() * arr.length)];
    }

    function calculateDistance(lat1, lon1, lat2, lon2) {
        const x = (lon2 - lon1) * Math.cos(((lat1 + lat2) / 2.0) * Math.PI / 180);
        const y = lat2 - lat1;
        return Math.sqrt(x*x + y*y) * 111.32; // distance in km
    }

    function projectCoordinate(lat, lon, speed, heading, dt) {
        if (speed <= 0) return { lat, lon };
        const headingRad = (heading * Math.PI) / 180;
        const latRad = (lat * Math.PI) / 180;
        const distNM = (speed * dt) / 3600;
        const dLat = (distNM / 60) * Math.cos(headingRad);
        const dLon = (distNM / 60) * Math.sin(headingRad) / Math.cos(latRad);
        return {
            lat: lat + dLat,
            lon: lon + dLon
        };
    }

    function getAirlineInfo(callsign) {
        const prefix = callsign.substring(0, 3);
        if (AIRLINE_MAP[prefix]) {
            return AIRLINE_MAP[prefix];
        }
        return { name: "Private/Other", logo: "✈️" };
    }

    function getFlightMetadata(callsign, aircraftType, flightType, closerAirport, customOrigin = null, customDest = null) {
        const prefix = callsign.substring(0, 3);
        const rngCallsign = getSeededRandom(callsign);
        
        let reg = "";
        if (prefix === "UAE" || prefix === "ETD") {
            reg = `A6-${randomChoice(rngCallsign, ['E','F','G','H'])}${randomChoice(rngCallsign, ['J','K','L','M','N','O','P','Q'])}${randomChoice(rngCallsign, ['A','B','C','D','E','F'])}`;
        } else if (prefix === "SIA") {
            reg = `9V-${randomChoice(rngCallsign, ['S','M','N'])}${randomChoice(rngCallsign, ['A','B','C','D','E'])}${randomChoice(rngCallsign, ['F','G','H','I','J'])}`;
        } else if (prefix === "QTR") {
            reg = `A7-${randomChoice(rngCallsign, ['A','L','M'])}${randomChoice(rngCallsign, ['A','B','C','D','E'])}${randomChoice(rngCallsign, ['F','G','H','I','J'])}`;
        } else if (prefix === "BAW") {
            reg = `G-X${randomChoice(rngCallsign, ['W','Y','Z'])}${randomChoice(rngCallsign, ['A','B','C','D','E'])}${randomChoice(rngCallsign, ['F','G','H','I','J'])}`;
        } else if (prefix === "LHA") {
            reg = `D-A${randomChoice(rngCallsign, ['B','C','E'])}${randomChoice(rngCallsign, ['A','B','C','D','E'])}${randomChoice(rngCallsign, ['F','G','H','I','J'])}`;
        } else {
            let regChar = "I";
            if (prefix === "IGO") regChar = randomChoice(rngCallsign, ["I", "Y"]);
            else if (prefix === "AIC") regChar = randomChoice(rngCallsign, ["A", "E"]);
            else if (prefix === "VTI") regChar = "T";
            else if (prefix === "SEJ") regChar = "S";
            else if (prefix === "AKJ") regChar = "K";
            
            reg = `VT-${regChar}${randomChoice(rngCallsign, "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""))}${randomChoice(rngCallsign, "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""))}`;
        }

        const mInfo = MODEL_DATA[aircraftType] || {
            name: `Aircraft ${aircraftType}`,
            engines: "Twin Jet Engines",
            photo_url: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=80",
            msn_range: [1000, 9999],
            age_range: [1.0, 15.0]
        };
        
        const age = Number(randomUniform(rngCallsign, mInfo.age_range[0], mInfo.age_range[1]).toFixed(1));
        const msn = randomInt(rngCallsign, mInfo.msn_range[0], mInfo.msn_range[1]);

        let origin = null;
        let destination = null;

        const parseAirportCode = (str) => {
            if (!str) return null;
            if (str.includes("(") && str.includes(")")) {
                const code = str.split("(")[1].split(")")[0];
                return AIRPORTS[code] ? code : str;
            }
            return str;
        };

        if (customOrigin) origin = parseAirportCode(customOrigin);
        if (customDest) destination = parseAirportCode(customDest);

        if (!origin) {
            if (flightType === "arrival") {
                if (prefix === "UAE") origin = "OMDB";
                else if (prefix === "SIA") origin = "WSSS";
                else if (prefix === "QTR") origin = "QTR";
                else if (prefix === "BAW") origin = "EGLL";
                else origin = randomChoice(rngCallsign, ["VIDP", "VOBL", "VOMM", "VOGO"]);
            } else {
                origin = closerAirport;
            }
        }

        if (!destination) {
            if (flightType === "departure") {
                if (prefix === "UAE") destination = "OMDB";
                else if (prefix === "SIA") destination = "WSSS";
                else if (prefix === "QTR") destination = "QTR";
                else if (prefix === "BAW") destination = "EGLL";
                else destination = randomChoice(rngCallsign, ["VIDP", "VOBL", "VOMM", "VOGO"]);
            } else {
                destination = closerAirport;
            }
        }

        const origFullname = AIRPORTS[origin] ? AIRPORTS[origin].fullname : (typeof origin === "string" ? origin : `En Route (${origin})`);
        const origCity = AIRPORTS[origin] ? AIRPORTS[origin].city : (typeof origin === "string" ? origin.split(" ")[0] : "En Route");
        const origIata = AIRPORTS[origin] ? AIRPORTS[origin].iata : (typeof origin === "string" && origin.includes("(") ? origin.split("(")[1].split(")")[0] : "BOM");

        const destFullname = AIRPORTS[destination] ? AIRPORTS[destination].fullname : (typeof destination === "string" ? destination : `En Route (${destination})`);
        const destCity = AIRPORTS[destination] ? AIRPORTS[destination].city : (typeof destination === "string" ? destination.split(" ")[0] : "En Route");
        const destIata = AIRPORTS[destination] ? AIRPORTS[destination].iata : (typeof destination === "string" && destination.includes("(") ? destination.split("(")[1].split(")")[0] : "BOM");

        const depHour = randomInt(rngCallsign, 0, 23);
        const depMin = randomChoice(rngCallsign, [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
        const durationHours = randomChoice(rngCallsign, [1, 2, 3, 5, 8]);
        const durationMins = randomChoice(rngCallsign, [0, 15, 30, 45]);

        const arrHour = (depHour + durationHours) % 24;
        const arrMin = (depMin + durationMins) % 60;

        const depTime = `${String(depHour).padStart(2, '0')}:${String(depMin).padStart(2, '0')}`;
        const arrTime = `${String(arrHour).padStart(2, '0')}:${String(arrMin).padStart(2, '0')}`;

        const photographers = [
            "Aravind Krishnan", "Rahul Sharma", "Vivek Patel", "Aniket Singh", "Sanjay Rao",
            "Priya Das", "Karan Malhotra", "Neha Gupta", "Rohan Joshi", "Rajesh Nair",
            "Siddharth Shah", "Sameer Deshmukh", "Tanmay Sen", "Vikram Kadam"
        ];
        const rngReg = getSeededRandom(reg);
        const photographer = randomChoice(rngReg, photographers);

        let manufacturer = "Boeing";
        if (mInfo.name.includes("Airbus")) {
            manufacturer = "Airbus";
        } else if (mInfo.name.includes("Gulfstream")) {
            manufacturer = "Gulfstream";
        }

        return {
            registration: reg,
            serial_number: `MSN ${msn}`,
            age: `${age} years`,
            engines: mInfo.engines,
            aircraft_fullname: mInfo.name,
            photo_url: mInfo.photo_url,
            origin_fullname: origFullname,
            origin_city: origCity,
            origin_iata: origIata,
            destination_fullname: destFullname,
            destination_city: destCity,
            destination_iata: destIata,
            dep_time: depTime,
            arr_time: arrTime,
            photographer: photographer,
            manufacturer: manufacturer
        };
    }

    function generateSimulatedFlights() {
        const now = Date.now() / 1000;
        const VABB_COORDS = [19.0896, 72.8656];
        const VANM_COORDS = [18.9919, 73.0617];
        
        const templates = [
            {
                callsign: "UAE504",
                model: "B77W",
                origin: "Dubai (OMDB)",
                destination: "Mumbai (VABB)",
                start_lat: 18.7, start_lon: 72.0,
                end_lat: VABB_COORDS[0], end_lon: VABB_COORDS[1],
                speed: 160, alt_start: 15000, alt_end: 0,
                duration: 900, cycle_offset: 0,
                type: "arrival", airport: "VABB"
            },
            {
                callsign: "IGO612",
                model: "A20N",
                origin: "Delhi (VIDP)",
                destination: "Mumbai (VABB)",
                start_lat: 19.5, start_lon: 72.8,
                end_lat: VABB_COORDS[0], end_lon: VABB_COORDS[1],
                speed: 140, alt_start: 8000, alt_end: 0,
                duration: 600, cycle_offset: 200,
                type: "arrival", airport: "VABB"
            },
            {
                callsign: "VTI821",
                model: "A321",
                origin: "Bangalore (VOBL)",
                destination: "Mumbai (VABB)",
                start_lat: 18.2, start_lon: 72.9,
                end_lat: VABB_COORDS[0], end_lon: VABB_COORDS[1],
                speed: 150, alt_start: 10000, alt_end: 0,
                duration: 700, cycle_offset: 450,
                type: "arrival", airport: "VABB"
            },
            {
                callsign: "SIA422",
                model: "A359",
                origin: "Singapore (WSSS)",
                destination: "Mumbai (VABB)",
                start_lat: 18.4, start_lon: 73.3,
                end_lat: VABB_COORDS[0], end_lon: VABB_COORDS[1],
                speed: 180, alt_start: 18000, alt_end: 0,
                duration: 1000, cycle_offset: 100,
                type: "arrival", airport: "VABB"
            },
            {
                callsign: "AIC101",
                model: "B788",
                origin: "Mumbai (VABB)",
                destination: "London (EGLL)",
                start_lat: VABB_COORDS[0], start_lon: VABB_COORDS[1],
                end_lat: 19.3, end_lon: 72.1,
                speed: 260, alt_start: 0, alt_end: 18000,
                duration: 800, cycle_offset: 150,
                type: "departure", airport: "VABB"
            },
            {
                callsign: "IGO804",
                model: "A20N",
                origin: "Mumbai (VABB)",
                destination: "Chennai (VOMM)",
                start_lat: VABB_COORDS[0], start_lon: VABB_COORDS[1],
                end_lat: 18.1, end_lon: 73.1,
                speed: 230, alt_start: 0, alt_end: 14000,
                duration: 700, cycle_offset: 300,
                type: "departure", airport: "VABB"
            },
            {
                callsign: "AKJ112",
                model: "B38M",
                origin: "Mumbai (VABB)",
                destination: "Goa (VOGO)",
                start_lat: VABB_COORDS[0], start_lon: VABB_COORDS[1],
                end_lat: 18.3, end_lon: 72.7,
                speed: 220, alt_start: 0, alt_end: 12000,
                duration: 650, cycle_offset: 500,
                type: "departure", airport: "VABB"
            },
            {
                callsign: "GLF6_VIP",
                model: "GLF6",
                origin: "Delhi (VIDP)",
                destination: "Navi Mumbai (VANM)",
                start_lat: 19.6, start_lon: 73.2,
                end_lat: VANM_COORDS[0], end_lon: VANM_COORDS[1],
                speed: 170, alt_start: 12000, alt_end: 0,
                duration: 850, cycle_offset: 350,
                type: "arrival", airport: "VANM"
            },
            {
                callsign: "AIC_TEST",
                model: "GLF6",
                origin: "Navi Mumbai (VANM)",
                destination: "Pune (VAPO)",
                start_lat: VANM_COORDS[0], start_lon: VANM_COORDS[1],
                end_lat: 18.6, end_lon: 73.9,
                speed: 190, alt_start: 0, alt_end: 10000,
                duration: 600, cycle_offset: 50,
                type: "departure", airport: "VANM"
            },
            {
                callsign: "SEJ154",
                model: "B38M",
                origin: "Mumbai (VABB)",
                destination: "Goa (VOGO)",
                lat: 19.091, lon: 72.862,
                speed: 0, alt: 0, heading: 90,
                type: "on_ground", airport: "VABB", gate: "Gate 14", status: "Boarding"
            },
            {
                callsign: "IGO105",
                model: "A20N",
                origin: "Hyderabad (VOHY)",
                destination: "Mumbai (VABB)",
                lat: 19.086, lon: 72.871,
                speed: 5, alt: 0, heading: 140,
                type: "on_ground", airport: "VABB", gate: "Taxiway M3", status: "Taxiing"
            },
            {
                callsign: "VT-NMA",
                model: "GLF6",
                origin: "Mumbai (VABB)",
                destination: "Navi Mumbai (VANM)",
                lat: 18.991, lon: 73.065,
                speed: 0, alt: 0, heading: 260,
                type: "on_ground", airport: "VANM", gate: "Apron A1", status: "Landed"
            }
        ];

        const flights = [];
        templates.forEach(t => {
            const airlineInfo = getAirlineInfo(t.callsign);
            const meta = getFlightMetadata(t.callsign, t.model, t.type, t.airport, t.origin, t.destination);
            const rngCallsign = getSeededRandom(t.callsign);

            if (t.type === "on_ground") {
                const icaoRandom = Math.floor(randomUniform(rngCallsign, 1000, 9999));
                flights.push({
                    icao24: `c0${icaoRandom}`,
                    callsign: t.callsign,
                    airline: airlineInfo.name,
                    logo: airlineInfo.logo,
                    model: t.model,
                    origin: meta.origin_city,
                    destination: meta.destination_city,
                    lat: t.lat,
                    lon: t.lon,
                    altitude: 0,
                    speed: t.speed,
                    heading: t.heading,
                    vertical_rate: 0,
                    status: t.status,
                    gate: t.gate,
                    type: "on_ground",
                    airport: t.airport,
                    trail: [[t.lon, t.lat]],
                    lastUpdatedTime: Date.now(),
                    baseLat: t.lat,
                    baseLon: t.lon,
                    baseAltitude: 0,
                    baseSpeed: t.speed,
                    baseHeading: t.heading,
                    ...meta
                });
                return;
            }

            const totalSec = t.duration;
            const progressPeriod = (now + t.cycle_offset) % totalSec;
            const fraction = progressPeriod / totalSec;

            const lat = t.start_lat + (t.end_lat - t.start_lat) * fraction;
            const lon = t.start_lon + (t.end_lon - t.start_lon) * fraction;
            const alt = t.alt_start + (t.alt_end - t.alt_start) * fraction;

            const deltaLat = t.end_lat - t.start_lat;
            const deltaLon = t.end_lon - t.start_lon;
            const heading = Math.round((Math.atan2(deltaLon, deltaLat) * 180 / Math.PI + 360) % 360);
            const vrate = Math.round((t.alt_end - t.alt_start) / (totalSec / 60.0));

            let status = "En Route";
            if (t.type === "arrival") {
                if (fraction > 0.85) status = "Final Approach";
                else if (fraction > 0.5) status = "Descending";
            } else { // departure
                if (fraction < 0.15) status = "Climbing";
                else if (fraction < 0.3) status = "Departed";
            }

            const trail = [];
            const steps = 5;
            for (let s = 0; s <= steps; s++) {
                const sFrac = fraction * (s / steps);
                const sLat = t.start_lat + (t.end_lat - t.start_lat) * sFrac;
                const sLon = t.start_lon + (t.end_lon - t.start_lon) * sFrac;
                trail.push([sLon, sLat]);
            }

            const icaoRandom = Math.floor(randomUniform(rngCallsign, 10000, 99999));
            flights.push({
                icao24: `c0${icaoRandom}`,
                callsign: t.callsign,
                airline: airlineInfo.name,
                logo: airlineInfo.logo,
                model: t.model,
                origin: meta.origin_city,
                destination: meta.destination_city,
                lat: Number(lat.toFixed(5)),
                lon: Number(lon.toFixed(5)),
                altitude: Math.round(alt),
                speed: t.speed,
                heading: heading,
                vertical_rate: vrate,
                status: status,
                gate: "",
                type: t.type,
                airport: t.airport,
                trail: trail,
                lastUpdatedTime: Date.now(),
                baseLat: Number(lat.toFixed(5)),
                baseLon: Number(lon.toFixed(5)),
                baseAltitude: Math.round(alt),
                baseSpeed: t.speed,
                baseHeading: heading,
                ...meta
            });
        });

        return flights;
    }

    function parseOpenSkyData(data) {
        const VABB_COORDS = [19.0896, 72.8656];
        const VANM_COORDS = [18.9919, 73.0617];
        const states = data.states || [];
        const flights = [];

        states.forEach(s => {
            const icao = s[0];
            const callsign = s[1] ? s[1].trim() : `FLT-${icao.toUpperCase().substring(0, 4)}`;
            if (!callsign) return;

            const lon = s[5];
            const lat = s[6];
            if (lon === null || lat === null) return;

            const alt = s[7] !== null ? Math.round(s[7] * 3.28084) : 0; // m to ft
            const onGround = s[8];
            const speed = s[9] !== null ? Math.round(s[9] * 1.94384) : 0; // m/s to kts
            const heading = s[10] !== null ? Math.round(s[10]) : 0;
            const vrate = s[11] !== null ? Math.round(s[11] * 196.85) : 0; // m/s to fpm

            const distVabb = calculateDistance(lat, lon, VABB_COORDS[0], VABB_COORDS[1]);
            const distVanm = calculateDistance(lat, lon, VANM_COORDS[0], VANM_COORDS[1]);

            const closerAirport = distVabb < distVanm ? "VABB" : "VANM";
            const closerDist = Math.min(distVabb, distVanm);

            const airlineInfo = getAirlineInfo(callsign);

            let flightType = "arrival";
            let status = "En Route";

            if (onGround) {
                flightType = "on_ground";
                status = closerDist < 2 ? "Landed" : "On Ground";
            } else if (vrate < -200) {
                flightType = "arrival";
                status = closerDist < 15 ? "Final Approach" : "Descending";
            } else if (vrate > 200) {
                flightType = "departure";
                status = "Climbing";
            } else {
                flightType = (closerDist < 40 && alt < 12000) ? "arrival" : "departure";
                status = "En Route";
            }

            let acModel = "B738";
            if (callsign.includes("IGO")) acModel = "A20N";
            else if (callsign.includes("AIC")) acModel = "B788";
            else if (callsign.includes("VTI")) acModel = "A321";
            else if (callsign.includes("UAE")) acModel = "B77W";
            else if (callsign.includes("SIA")) acModel = "A359";
            else if (callsign.includes("GLF")) acModel = "GLF6";

            const meta = getFlightMetadata(callsign, acModel, flightType, closerAirport);

            flights.push({
                icao24: icao,
                callsign: callsign,
                airline: airlineInfo.name,
                logo: airlineInfo.logo,
                model: acModel,
                origin: meta.origin_city,
                destination: meta.destination_city,
                lat: lat,
                lon: lon,
                altitude: alt,
                speed: speed,
                heading: heading,
                vertical_rate: vrate,
                status: status,
                gate: onGround ? "Gate A" : "",
                type: flightType,
                airport: closerAirport,
                trail: [[lon, lat]],
                lastUpdatedTime: Date.now(),
                baseLat: lat,
                baseLon: lon,
                baseAltitude: alt,
                baseSpeed: speed,
                baseHeading: heading,
                ...meta
            });
        });

        return flights;
    }

    // Load Data
    async function loadData(isInterval = false) {
        let loadedFromApi = false;
        try {
            const bbox = "lamin=18.5&lomin=72.4&lamax=19.4&lomax=73.4";
            const openskyUrl = `https://opensky-network.org/api/states/all?${bbox}`;
            const proxyUrl = `https://corsproxy.io/?` + encodeURIComponent(openskyUrl);
            
            console.log("📡 Querying live OpenSky API via CORS proxy...");
            const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(5000) });
            if (!response.ok) throw new Error(`Proxy error: ${response.status}`);
            
            const data = await response.json();
            if (data && data.states && data.states.length > 0) {
                state.flights = parseOpenSkyData(data);
                loadedFromApi = true;
                console.log(`✅ Loaded ${state.flights.length} live flight vectors from OpenSky.`);
            } else {
                console.warn("⚠️ OpenSky API returned empty states. Falling back to local/simulated feed.");
            }
        } catch (error) {
            console.warn("⚠️ Failed to load live OpenSky feed. Falling back to local data:", error);
        }

        // Fallback to flights.json if API fetch failed or returned no states
        if (!loadedFromApi) {
            try {
                const response = await fetch('flights.json?nocache=' + new Date().getTime());
                if (!response.ok) throw new Error('Local flights.json fetch issue');
                state.flights = await response.json();
                
                // Initialize baseline telemetry details for local flights to enable smooth extrapolation
                state.flights.forEach(f => {
                    f.lastUpdatedTime = Date.now();
                    f.baseLat = f.lat;
                    f.baseLon = f.lon;
                    f.baseAltitude = f.altitude;
                    f.baseSpeed = f.speed;
                    f.baseHeading = f.heading;
                });
                console.log(`💾 Loaded ${state.flights.length} flights from flights.json (fallback).`);
            } catch (error) {
                console.error("❌ Both live feed and local fallback failed:", error);
                console.log("🔄 Generating client-side simulated flights as absolute fallback...");
                state.flights = generateSimulatedFlights();
            }
        }

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
        if (flight && flight.trail && flight.trail.length > 0) {
            const points = flight.trail.map(coord => [coord[1], coord[0]]); // GeoJSON [lon, lat] -> Leaflet [lat, lon]
            
            // Append current extrapolated position if different from last point
            const lastPoint = points[points.length - 1];
            if (lastPoint && (lastPoint[0] !== flight.lat || lastPoint[1] !== flight.lon)) {
                points.push([flight.lat, flight.lon]);
            }
            
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

    // Dynamic position extrapolation animation loop running every 1 second
    setInterval(() => {
        if (!state.flights || state.flights.length === 0) return;
        
        state.flights.forEach(f => {
            if (f.type === 'on_ground' && f.speed === 0) return;
            
            const elapsedSeconds = (Date.now() - f.lastUpdatedTime) / 1000;
            const nextPos = projectCoordinate(f.baseLat, f.baseLon, f.speed, f.heading, elapsedSeconds);
            f.lat = nextPos.lat;
            f.lon = nextPos.lon;
            
            if (f.vertical_rate !== 0) {
                f.altitude = Math.max(0, Math.round(f.baseAltitude + (f.vertical_rate / 60) * elapsedSeconds));
            }
        });
        
        // Re-render markers and updated trails
        renderRadarMapMarkers();
        
        // Live update selected flight detail elements in the telemetry panel
        if (state.selectedFlightId) {
            const flight = state.flights.find(f => f.icao24 === state.selectedFlightId);
            if (flight) {
                elements.detailAltitude.textContent = formatAltitude(flight.altitude);
                elements.detailLat.textContent = flight.lat.toFixed(4);
                elements.detailLon.textContent = flight.lon.toFixed(4);
                
                // Re-calculate and update route progress
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
                            arrTotalMin += 24 * 60;
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
                            progressPercent = 30;
                        }
                    } catch (err) {
                        progressPercent = 50;
                    }
                }
                
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
            }
        }
    }, 1000);
});
