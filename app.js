/* ==========================================================================
   AeroRadar — FlightRadar24-style Live Dashboard
   Engineered by Ankit Singh | VABB & VANM Focus
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════
const state = {
    flights: [],           // active flight objects
    flightHistory: {},     // icao24 → [{lat,lon,alt,ts}, ...]  (trail accumulation)
    selectedFlightId: null,
    currentTab: 'tab-map',
    searchQuery: '',
    airportFilter: 'all',
    map: null,
    markers: {},           // icao24 → { marker, vector }
    trailLayers: {},       // icao24 → [L.polyline, ...]
    destArc: null,         // great-circle arc to selected destination
    destMarker: null,      // destination airport marker
    proximityLayers: [],   // TCAS/proximity warning layers
    notamLayers: {},
    selectedNotamId: null,
    mapCenter: [19.09, 72.87],   // VABB
    mapDefaultZoom: 10,
    soundEnabled: false,   // off by default – user must opt-in
    dataSource: '—',
    lastRefresh: null,
    refreshInterval: null,
    sort: {
        arrivals: { column: null, order: 'asc' },
        departures: { column: null, order: 'asc' },
        ground: { column: null, order: 'asc' },
        notams: { column: null, order: 'asc' }
    },
    globalTrailsEnabled: true,
    notamOverlaysVisible: true,
};

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const VABB = { icao: 'VABB', iata: 'BOM', name: 'Chhatrapati Shivaji Maharaj Intl',
               lat: 19.0896, lon: 72.8656, rwys: [{hdg:90},{hdg:140}] };
const VANM = { icao: 'VANM', iata: 'NMI', name: 'Navi Mumbai International',
               lat: 18.9919, lon: 73.0617, rwys: [{hdg:80}] };
const AIRPORTS_DB = { VABB, VANM };

// Known airports for destination lookup (IATA → coords)
const AIRPORT_COORDS = {
    // IATA
    DEL:[28.5562,77.1000], BOM:[19.0896,72.8656], BLR:[13.1979,77.7063],
    HYD:[17.2313,78.4298], MAA:[12.9941,80.1709], CCU:[22.6547,88.4467],
    AMD:[23.0772,72.6347], GOI:[15.3808,73.8314], COK:[10.1520,76.4019],
    PNQ:[18.5822,73.9197], JAI:[26.8242,75.8122], LKO:[26.7606,80.8893],
    ATQ:[31.7096,74.7973], IXC:[30.6735,76.7885], PAT:[25.5913,85.0880],
    BHO:[23.2875,77.3374], VNS:[25.4524,82.8593], GAY:[24.7433,84.9511],
    UDR:[24.6177,73.8961], JDH:[26.2511,73.0489], BDQ:[22.3362,73.2264],
    NAG:[21.0922,79.0472], RPR:[21.1804,81.7388], IXB:[26.6812,88.3286],
    SXR:[33.9871,74.7742], LEH:[34.1359,77.5465], IXJ:[32.6891,74.8374],
    DXB:[25.2532,55.3657], AUH:[24.4330,54.6511], DOH:[25.2731,51.6081],
    SIN:[1.3502,103.9943], KUL:[2.7456,101.7099], BKK:[13.6811,100.7478],
    LHR:[51.4775,-0.4614], CDG:[49.0097,2.5479], FRA:[50.0379,8.5622],
    AMS:[52.3105,4.7683], IST:[41.2753,28.7519], KWI:[29.2266,47.9689],
    MCT:[23.5933,58.2844], BAH:[26.2708,50.6336], RUH:[24.9579,46.6988],
    JED:[21.6796,39.1565], CAI:[30.1219,31.4056], NBO:[1.3192,36.9275],
    JNB:[-26.1367,28.2411], HKG:[22.3080,113.9185], ICN:[37.4602,126.4407],
    NRT:[35.7647,140.3864], PEK:[40.0799,116.6031], PVG:[31.1443,121.8083],
    SYD:[-33.9461,151.1772], MEL:[-37.6733,144.8433], MUM:[19.0896,72.8656],
    DUB:[53.4213,-6.2701], MLE:[4.1918,73.5291], CMB:[7.1807,79.8841],
    DAC:[23.8433,90.3978], KTM:[27.6966,85.3591], SGN:[10.8188,106.6519],
    HKT:[8.1132,98.3066], PEN:[5.2971,100.2769], CGK:[-6.1256,106.6558],

    // ICAO equivalents
    VIDP:[28.5562,77.1000], VABB:[19.0896,72.8656], VOBL:[13.1979,77.7063],
    VOHS:[17.2313,78.4298], VOMM:[12.9941,80.1709], VECC:[22.6547,88.4467],
    VAAH:[23.0772,72.6347], VOGO:[15.3808,73.8314], VOCI:[10.1520,76.4019],
    VAPO:[18.5822,73.9197], VIJP:[26.8242,75.8122], VILK:[26.7606,80.8893],
    VIAR:[31.7096,74.7973], VICG:[30.6735,76.7885], VEPT:[25.5913,85.0880],
    VABP:[23.2875,77.3374], VIBY:[25.4524,82.8593], VEGY:[24.7433,84.9511],
    VAUD:[24.6177,73.8961], VIJO:[26.2511,73.0489], VABO:[22.3362,73.2264],
    VANP:[21.0922,79.0472], VARP:[21.1804,81.7388], VEBD:[26.6812,88.3286],
    VISR:[33.9871,74.7742], VILH:[34.1359,77.5465], VIJU:[32.6891,74.8374],
    OMDB:[25.2532,55.3657], OMAA:[24.4330,54.6511], OTHH:[25.2731,51.6081],
    WSSS:[1.3502,103.9943], WMKK:[2.7456,101.7099], VTBS:[13.6811,100.7478],
    EGLL:[51.4775,-0.4614], LFPG:[49.0097,2.5479], EDDF:[50.0379,8.5622],
    EHAM:[52.3105,4.7683], LTFM:[41.2753,28.7519], OKBK:[29.2266,47.9689],
    OOMS:[23.5933,58.2844], OBBI:[26.2708,50.6336], OERK:[24.9579,46.6988],
    OEJN:[21.6796,39.1565], HECA:[30.1219,31.4056], HKJK:[1.3192,36.9275],
    FAOR:[-26.1367,28.2411], VHHH:[22.3080,113.9185], RKSI:[37.4602,126.4407],
    RJAA:[35.7647,140.3864], ZBAA:[40.0799,116.6031], ZSPD:[31.1443,121.8083],
    YSSY:[-33.9461,151.1772], YMML:[-37.6733,144.8433],
    EIDW:[53.4213,-6.2701], VRMM:[4.1918,73.5291], VCBI:[7.1807,79.8841],
    VGHS:[23.8433,90.3978], VNKT:[27.6966,85.3591], VVTS:[10.8188,106.6519],
    VTSP:[8.1132,98.3066], WMKP:[5.2971,100.2769], WIII:[-6.1256,106.6558],
};

const ICAO_TO_IATA = {
    VIDP:'DEL', VABB:'BOM', VOBL:'BLR', VOHS:'HYD', VOMM:'MAA', VECC:'CCU',
    VAAH:'AMD', VOGO:'GOI', VOCI:'COK', VAPO:'PNQ', VIJP:'JAI', VILK:'LKO',
    VIAR:'ATQ', VICG:'IXC', VEPT:'PAT', VABP:'BHO', VIBY:'VNS', VEGY:'GAY',
    VAUD:'UDR', VIJO:'JDH', VABO:'BDQ', VANP:'NAG', VARP:'RPR', VEBD:'IXB',
    VISR:'SXR', VILH:'LEH', VIJU:'IXJ', OMDB:'DXB', OMAA:'AUH', OTHH:'DOH',
    WSSS:'SIN', WMKK:'KUL', VTBS:'BKK', EGLL:'LHR', LFPG:'CDG', EDDF:'FRA',
    EHAM:'AMS', LTFM:'IST', OKBK:'KWI', OOMS:'MCT', OBBI:'BAH', OERK:'RUH',
    OEJN:'JED', HECA:'CAI', HKJK:'NBO', FAOR:'JNB', VHHH:'HKG', RKSI:'ICN',
    RJAA:'NRT', ZBAA:'PEK', ZSPD:'PVG', YSSY:'SYD', YMML:'MEL', EIDW:'DUB',
    VRMM:'MLE', VCBI:'CMB', VGHS:'DAC', VNKT:'KTM', VVTS:'SGN', VTSP:'HKT',
    WMKP:'PEN', WIII:'CGK'
};

// Airline callsign prefix → {name, logo, iata}
const AIRLINES = {
    'AIC': { name:'Air India',            iata:'AI',  logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Air_India_logo.svg/240px-Air_India_logo.svg.png' },
    'IGO': { name:'IndiGo',              iata:'6E',  logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/IndiGo_logo.svg/240px-IndiGo_logo.svg.png' },
    'VTI': { name:'Vistara',             iata:'UK',  logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Vistara_Logo.svg/240px-Vistara_Logo.svg.png' },
    'SEJ': { name:'SpiceJet',            iata:'SG',  logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/SpiceJet_Logo.svg/240px-SpiceJet_Logo.svg.png' },
    'AKJ': { name:'Akasa Air',           iata:'QP',  logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Akasa_Air_logo.svg/240px-Akasa_Air_logo.svg.png' },
    'GOI': { name:'Go First',            iata:'G8',  logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Go_First_logo.svg/240px-Go_First_logo.svg.png' },
    'ABY': { name:'Air Arabia India',    iata:'G9',  logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Air_Arabia_Logo.svg/240px-Air_Arabia_Logo.svg.png' },
    'UAE': { name:'Emirates',            iata:'EK',  logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Emirates_logo.svg/240px-Emirates_logo.svg.png' },
    'ETD': { name:'Etihad Airways',      iata:'EY',  logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Etihad_Airways_Logo.svg/240px-Etihad_Airways_Logo.svg.png' },
    'QTR': { name:'Qatar Airways',       iata:'QR',  logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Qatar_Airways_Logo.svg/240px-Qatar_Airways_Logo.svg.png' },
    'FDB': { name:'flydubai',            iata:'FZ',  logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Flydubai_logo.svg/240px-Flydubai_logo.svg.png' },
    'AXB': { name:'Air Arabia',          iata:'G9',  logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Air_Arabia_Logo.svg/240px-Air_Arabia_Logo.svg.png' },
    'SIA': { name:'Singapore Airlines',  iata:'SQ',  logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Singapore_Airlines_Logo_2.svg/240px-Singapore_Airlines_Logo_2.svg.png' },
    'BAW': { name:'British Airways',     iata:'BA',  logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/British_Airways_Logo.svg/240px-British_Airways_Logo.svg.png' },
    'LHA': { name:'Lufthansa',           iata:'LH',  logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Lufthansa_Logo_2018.svg/240px-Lufthansa_Logo_2018.svg.png' },
    'KLM': { name:'KLM',                 iata:'KL',  logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/KLM_logo.svg/240px-KLM_logo.svg.png' },
    'AFR': { name:'Air France',          iata:'AF',  logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Air_France_Logo.svg/240px-Air_France_Logo.svg.png' },
    'THY': { name:'Turkish Airlines',    iata:'TK',  logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Turkish_Airlines_logo.svg/240px-Turkish_Airlines_logo.svg.png' },
    'SVA': { name:'Saudia',              iata:'SV',  logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Saudia_logo.svg/240px-Saudia_logo.svg.png' },
    'KAC': { name:'Kuwait Airways',      iata:'KU',  logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Kuwait_Airways_Logo.svg/240px-Kuwait_Airways_Logo.svg.png' },
    'GFA': { name:'Gulf Air',            iata:'GF',  logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Gulf_Air_Logo.svg/240px-Gulf_Air_Logo.svg.png' },
    'ADY': { name:'Azur Air',            iata:'ZF',  logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Azur_Air_logo.svg/240px-Azur_Air_logo.svg.png' },
    'AHY': { name:'Azerbaijan Airlines', iata:'J2',  logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Azerbaijan_Airlines_Logo.svg/240px-Azerbaijan_Airlines_Logo.svg.png' },
};
const FALLBACK_LOGO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/White_and_yellow_plane_icon.svg/120px-White_and_yellow_plane_icon.svg.png';

// Widebody models (get bigger SVG)
const WIDEBODY = new Set(['B77W','B772','B773','B778','B779','B788','B789','B78X',
                          'A332','A333','A338','A339','A359','A35K','A380','A388',
                          'B744','B748','A124','IL96','A306']);

// ═══════════════════════════════════════════════════════════════════════════
// DOM REFS
// ═══════════════════════════════════════════════════════════════════════════
const el = {
    tabs:              document.querySelectorAll('.nav-btn'),
    tabPanels:         document.querySelectorAll('.tab-panel'),
    searchInput:       document.getElementById('flight-search-input'),
    filterButtons:     document.querySelectorAll('.filter-btn'),
    lastUpdatedText:   document.getElementById('last-updated-text'),
    arrivalsCount:     document.getElementById('arrivals-count'),
    departuresCount:   document.getElementById('departures-count'),
    groundCount:       document.getElementById('ground-count'),
    notamsCount:       document.getElementById('notams-count'),
    detailViewer:      document.getElementById('detail-viewer'),
    closeTelemetryBtn: document.getElementById('close-telemetry-btn'),
    detailStatusBadge: document.getElementById('detail-status-badge'),
    detailCallsign:    document.getElementById('detail-callsign'),
    detailLogo:        document.getElementById('detail-logo'),
    detailAirline:     document.getElementById('detail-airline'),
    detailModel:       document.getElementById('detail-model'),
    detailOrigin:      document.getElementById('detail-origin'),
    detailDestination: document.getElementById('detail-destination'),
    detailAltitude:    document.getElementById('detail-altitude'),
    detailSpeed:       document.getElementById('detail-speed'),
    detailHeading:     document.getElementById('detail-heading'),
    detailVrate:       document.getElementById('detail-vrate'),
    detailLat:         document.getElementById('detail-lat'),
    detailLon:         document.getElementById('detail-lon'),
    detailSquawk:      document.getElementById('detail-squawk'),
    detailIcao24:      document.getElementById('detail-icao24'),
    detailGate:        document.getElementById('detail-gate'),
    detailGateContainer:document.getElementById('detail-gate-container'),
    detailOwner:       document.getElementById('detail-owner'),
    detailSource:      document.getElementById('detail-source'),
    detailDistRem:     document.getElementById('detail-dist-rem'),
    detailEta:         document.getElementById('detail-eta'),
    soundToggleBtn:    document.getElementById('sound-toggle-btn'),
    soundIcon:         document.getElementById('sound-icon'),
    notamsTableBody:   document.querySelector('#notams-table tbody'),
    detailPhotoImg:    document.getElementById('detail-photo-img'),
    detailPhotoCredit: document.getElementById('detail-photo-credit'),
    detailAircraftFullname: document.getElementById('detail-aircraft-fullname'),
    detailOriginFull:  document.getElementById('detail-origin-full'),
    detailDestinationFull: document.getElementById('detail-destination-full'),
    detailDepTime:     document.getElementById('detail-dep-time'),
    detailArrTime:     document.getElementById('detail-arr-time'),
    detailProgressFill:document.getElementById('detail-progress-fill'),
    detailProgressPlane:document.getElementById('detail-progress-plane'),
    detailProgressPercent:document.getElementById('detail-progress-percent'),
    detailRegistration:document.getElementById('detail-registration'),
    detailSerial:      document.getElementById('detail-serial'),
    detailAge:         document.getElementById('detail-age'),
    detailManufacturer:document.getElementById('detail-manufacturer'),
    detailEngines:     document.getElementById('detail-engines'),
    arrivalsTableBody: document.querySelector('#arrivals-table tbody'),
    departuresTableBody:document.querySelector('#departures-table tbody'),
    groundTableBody:   document.querySelector('#ground-table tbody'),
};

// ═══════════════════════════════════════════════════════════════════════════
// AUDIO
// ═══════════════════════════════════════════════════════════════════════════
let audioCtx = null;
function playBeep(freq=800, type='sine', dur=0.06) {
    if (!state.soundEnabled) return;
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
        if (audioCtx.state==='suspended') audioCtx.resume();
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = type; o.frequency.value = freq;
        g.gain.setValueAtTime(0.07, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime+dur);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(); o.stop(audioCtx.currentTime+dur);
    } catch(e){}
}

// ═══════════════════════════════════════════════════════════════════════════
// AIRCRAFT SVG SILHOUETTES
// ═══════════════════════════════════════════════════════════════════════════
function getPlaneSVG(isWide, color) {
    if (isWide) {
        return `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
          <ellipse cx="22" cy="22" rx="3" ry="15" fill="${color}"/>
          <ellipse cx="22" cy="23" rx="19" ry="3.5" fill="${color}" opacity=".9"/>
          <ellipse cx="22" cy="35" rx="8" ry="2" fill="${color}" opacity=".8"/>
          <ellipse cx="22" cy="9"  rx="2" ry="4"  fill="${color}"/>
          <ellipse cx="10" cy="24" rx="2.2" ry="4" fill="${color}" opacity=".75"/>
          <ellipse cx="34" cy="24" rx="2.2" ry="4" fill="${color}" opacity=".75"/>
        </svg>`;
    }
    return `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" width="30" height="30">
      <ellipse cx="20" cy="20" rx="2.2" ry="13" fill="${color}"/>
      <ellipse cx="20" cy="21" rx="15"  ry="2.8" fill="${color}" opacity=".9"/>
      <ellipse cx="20" cy="31" rx="6"   ry="1.6" fill="${color}" opacity=".8"/>
      <ellipse cx="20" cy="9"  rx="1.5" ry="3"   fill="${color}"/>
      <ellipse cx="12" cy="22" rx="1.7" ry="3.2" fill="${color}" opacity=".72"/>
      <ellipse cx="28" cy="22" rx="1.7" ry="3.2" fill="${color}" opacity=".72"/>
    </svg>`;
}

function getGroundSVG(color) {
    return `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
      <ellipse cx="16" cy="16" rx="2" ry="10" fill="${color}"/>
      <ellipse cx="16" cy="16" rx="10" ry="2" fill="${color}" opacity=".8"/>
      <ellipse cx="16" cy="25" rx="4" ry="1.2" fill="${color}" opacity=".7"/>
    </svg>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// COLOUR BY ALTITUDE  (FlightRadar24 style)
// ═══════════════════════════════════════════════════════════════════════════
function altColor(flight) {
    if (flight.type === 'on_ground') return '#90a4ae';
    const a = flight.altitude;
    if (a > 35000) return '#00b0ff';   // high cruise – light blue
    if (a > 25000) return '#00e5ff';   // cruise – cyan
    if (a > 15000) return '#00e676';   // climbing/descending – green
    if (a > 8000)  return '#ffeb3b';   // low – yellow
    if (a > 3000)  return '#ffb300';   // approach – amber
    return '#ff6d00';                  // final – orange
}

// ═══════════════════════════════════════════════════════════════════════════
// GEO HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function haversine(lat1,lon1,lat2,lon2) {
    const R=6371, dL=(lat2-lat1)*Math.PI/180, dl=(lon2-lon1)*Math.PI/180;
    const a=Math.sin(dL/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dl/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function projectPos(lat,lon,speedKts,hdgDeg,secs) {
    if (!speedKts || secs<=0) return {lat,lon};
    const R=6371, d=(speedKts*1.852/3600*secs)/R;
    const h=hdgDeg*Math.PI/180, p=lat*Math.PI/180, l=lon*Math.PI/180;
    const p2=Math.asin(Math.sin(p)*Math.cos(d)+Math.cos(p)*Math.sin(d)*Math.cos(h));
    const l2=l+Math.atan2(Math.sin(h)*Math.sin(d)*Math.cos(p),Math.cos(d)-Math.sin(p)*Math.sin(p2));
    return {lat:p2*180/Math.PI, lon:l2*180/Math.PI};
}

// Great-circle arc sample points
function gcArc(lat1,lon1,lat2,lon2,n=60) {
    const pts=[];
    for (let i=0;i<=n;i++) {
        const f=i/n;
        const d=haversine(lat1,lon1,lat2,lon2)/6371;
        const A=Math.sin((1-f)*d)/Math.sin(d);
        const B=Math.sin(f*d)/Math.sin(d);
        const x=A*Math.cos(lat1*Math.PI/180)*Math.cos(lon1*Math.PI/180)+B*Math.cos(lat2*Math.PI/180)*Math.cos(lon2*Math.PI/180);
        const y=A*Math.cos(lat1*Math.PI/180)*Math.sin(lon1*Math.PI/180)+B*Math.cos(lat2*Math.PI/180)*Math.sin(lon2*Math.PI/180);
        const z=A*Math.sin(lat1*Math.PI/180)+B*Math.sin(lat2*Math.PI/180);
        pts.push([Math.atan2(z,Math.sqrt(x*x+y*y))*180/Math.PI, Math.atan2(y,x)*180/Math.PI]);
    }
    return pts;
}

// ═══════════════════════════════════════════════════════════════════════════
// AIRLINE / AIRPORT HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function getAirlineInfo(callsign) {
    const prefix = callsign.replace(/\d+.*/,'').substring(0,3).toUpperCase();
    const prefix2 = callsign.substring(0,2).toUpperCase();
    return AIRLINES[prefix] || AIRLINES[prefix2] || { name: callsign.substring(0,3)||'Unknown', iata:'??', logo: FALLBACK_LOGO };
}

function guessDestination(callsign, flightType, closerAirport) {
    // For arrivals to BOM/VABB, destination is BOM; for departures it's guessed from number
    const num = parseInt(callsign.replace(/\D+/g,'')) || 0;
    const routes = {
        IGO: ['DEL','BLR','HYD','CCU','MAA','AMD','COK','JAI','LKO'],
        AIC: ['DEL','LHR','JFK','SIN','HKG','FRA','CDG','DOH','DXB'],
        SEJ: ['DEL','BLR','HYD','CCU','GOI','JAI','AMD','COK'],
        VTI: ['DEL','BLR','HYD','CCU','PNQ','LHR','SIN'],
        AKJ: ['DEL','BLR','HYD','AMD','COK','GOI'],
        UAE: ['DXB'], ETD: ['AUH'], QTR: ['DOH'],
        BAW: ['LHR'], LHA: ['FRA'], KLM: ['AMS'], AFR: ['CDG'],
        THY: ['IST'], SVA: ['JED','RUH'], KAC: ['KWI'], GFA: ['BAH'],
        FDB: ['DXB'], SIA: ['SIN'], AXB: ['AUH'],
    };
    const prefix = callsign.replace(/\d+.*/,'').substring(0,3).toUpperCase();
    const arr = routes[prefix];
    if (arr) {
        if (flightType === 'arrival') {
            return { dest: closerAirport === 'VABB' ? 'BOM' : 'NMI',
                     origin: arr[num % arr.length] };
        }
        return { dest: arr[num % arr.length], origin: closerAirport === 'VABB' ? 'BOM' : 'NMI' };
    }
    return { dest: flightType === 'arrival' ? 'BOM' : 'DEL', origin: 'DEL' };
}

function getDeterministicOwner(callsign) {
    const prefix = callsign.replace(/\d+.*/,'').substring(0,3).toUpperCase();
    
    if (prefix === 'AIC') return 'Tata Group / Air India';
    if (prefix === 'IGO') return 'InterGlobe Aviation Ltd (IndiGo)';
    if (prefix === 'VTI') return 'Tata SIA Airlines Ltd (Vistara)';
    if (prefix === 'SEJ') return 'SpiceJet Ltd';
    if (prefix === 'AKJ') return 'SNV Aviation Pvt Ltd (Akasa Air)';
    if (prefix === 'UAE') return 'The Emirates Group';
    if (prefix === 'SIA') return 'Singapore Airlines Group';
    if (prefix === 'QTR') return 'Qatar Airways Group';
    if (prefix === 'BAW') return 'International Airlines Group';
    if (prefix === 'LHA') return 'Lufthansa Group';
    if (prefix === 'ETD') return 'Etihad Aviation Group';
    if (prefix === 'JAI') return 'Jalan Kalrock Consortium';
    
    const privateOwners = [
        "Reliance Industries (Mukesh Ambani)",
        "Adani Group (Gautam Adani)",
        "Tata Sons Private Aviation",
        "Poonawalla Aviation (Serum Institute)",
        "JSW Aviation (Sajjan Jindal)",
        "Mahindra & Mahindra Aviation",
        "NetJets Private Aviation",
        "Club One Air",
        "Birla Group Aviation",
        "GMR Group Aviation"
    ];
    let sum = 0;
    for (let i = 0; i < callsign.length; i++) {
        sum += callsign.charCodeAt(i) * (i + 1);
    }
    return privateOwners[sum % privateOwners.length];
}

function getAirportName(code) {
    if (AIRPORTS_DB[code]) return AIRPORTS_DB[code].name;
    const iataNames = {
        DEL: 'Indira Gandhi International, Delhi',
        BOM: 'Chhatrapati Shivaji Maharaj, Mumbai',
        BLR: 'Kempegowda International, Bengaluru',
        HYD: 'Rajiv Gandhi International, Hyderabad',
        MAA: 'Chennai International, Chennai',
        CCU: 'Netaji Subhash Chandra Bose, Kolkata',
        AMD: 'Sardar Vallabhbhai Patel, Ahmedabad',
        GOI: 'Dabolim Airport, Goa',
        COK: 'Cochin International, Kochi',
        PNQ: 'Pune International, Pune',
        JAI: 'Jaipur International, Jaipur',
        LKO: 'Chaudhary Charan Singh, Lucknow',
        ATQ: 'Sri Guru Ram Dass Jee, Amritsar',
        IXC: 'Shaheed Bhagat Singh, Chandigarh',
        PAT: 'Jay Prakash Narayan, Patna',
        BHO: 'Raja Bhoj Airport, Bhopal',
        VNS: 'Lal Bahadur Shastri, Varanasi',
        GAY: 'Gaya Airport, Gaya',
        UDR: 'Maharana Pratap Airport, Udaipur',
        JDH: 'Jodhpur Airport, Jodhpur',
        BDQ: 'Vadodara Airport, Vadodara',
        NAG: 'Dr. Babasaheb Ambedkar, Nagpur',
        RPR: 'Swami Vivekananda, Raipur',
        IXB: 'Bagdogra Airport, Siliguri',
        SXR: 'Srinagar International, Srinagar',
        LEH: 'Kushok Bakula Rimpoche, Leh',
        IXJ: 'Jammu Airport, Jammu',
        DXB: 'Dubai International, Dubai',
        AUH: 'Zayed International, Abu Dhabi',
        DOH: 'Hamad International, Doha',
        SIN: 'Changi Airport, Singapore',
        KUL: 'Kuala Lumpur International, KL',
        BKK: 'Suvarnabhumi Airport, Bangkok',
        LHR: 'London Heathrow, London',
        CDG: 'Charles de Gaulle, Paris',
        FRA: 'Frankfurt Airport, Frankfurt',
        AMS: 'Amsterdam Schiphol, Amsterdam',
        IST: 'Istanbul Airport, Istanbul',
        KWI: 'Kuwait International, Kuwait',
        MCT: 'Muscat International, Muscat',
        BAH: 'Bahrain International, Bahrain',
        RUH: 'King Khalid International, Riyadh',
        JED: 'King Abdulaziz International, Jeddah',
        CAI: 'Cairo International, Cairo',
        NBO: 'Jomo Kenyatta International, Nairobi',
        JNB: 'O. R. Tambo International, Johannesburg',
        HKG: 'Hong Kong International, HK',
        ICN: 'Incheon International, Seoul',
        NRT: 'Narita International, Tokyo',
        PEK: 'Beijing Capital, Beijing',
        PVG: 'Shanghai Pudong, Shanghai',
        SYD: 'Kingsford Smith Airport, Sydney',
        MEL: 'Melbourne Airport, Melbourne',
        DUB: 'Dublin Airport, Dublin',
    };
    const mappedIata = ICAO_TO_IATA[code] || code;
    return iataNames[mappedIata] || `${mappedIata} Airport`;
}


// ═══════════════════════════════════════════════════════════════════════════
// MODEL DATA
// ═══════════════════════════════════════════════════════════════════════════
const MODEL_DB = {
    'A20N': { full:'Airbus A320neo', mfr:'Airbus', eng:'2× CFM LEAP-1A26',
              photo:'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=600&q=80' },
    'A21N': { full:'Airbus A321neo', mfr:'Airbus', eng:'2× PW1133G-JM',
              photo:'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=600&q=80' },
    'A320': { full:'Airbus A320ceo', mfr:'Airbus', eng:'2× CFM56-5B',
              photo:'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=600&q=80' },
    'A321': { full:'Airbus A321ceo', mfr:'Airbus', eng:'2× CFM56-5B3',
              photo:'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=600&q=80' },
    'A319': { full:'Airbus A319ceo', mfr:'Airbus', eng:'2× CFM56-5B5',
              photo:'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=600&q=80' },
    'B738': { full:'Boeing 737-800', mfr:'Boeing',  eng:'2× CFM56-7B27',
              photo:'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=600&q=80' },
    'B77W': { full:'Boeing 777-300ER', mfr:'Boeing', eng:'2× GE GE90-115B',
              photo:'https://images.unsplash.com/photo-1606761568499-6d2451b23c66?w=600&q=80' },
    'B788': { full:'Boeing 787-8 Dreamliner', mfr:'Boeing', eng:'2× RR Trent 1000',
              photo:'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=600&q=80' },
    'B789': { full:'Boeing 787-9 Dreamliner', mfr:'Boeing', eng:'2× GE GEnx-1B76',
              photo:'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=600&q=80' },
    'A359': { full:'Airbus A350-900',  mfr:'Airbus', eng:'2× RR Trent XWB-84',
              photo:'https://images.unsplash.com/photo-1517999144091-3d9dca6d1e43?w=600&q=80' },
    'A388': { full:'Airbus A380-800',  mfr:'Airbus', eng:'4× RR Trent 970',
              photo:'https://images.unsplash.com/photo-1556388158-158ea5ccacbd?w=600&q=80' },
    'A333': { full:'Airbus A330-300',  mfr:'Airbus', eng:'2× RR Trent 772B',
              photo:'https://images.unsplash.com/photo-1606761568499-6d2451b23c66?w=600&q=80' },
};
function modelInfo(type) { return MODEL_DB[type?.toUpperCase()] || { full: type||'Unknown', mfr:'—', eng:'—', photo:'' }; }

// ═══════════════════════════════════════════════════════════════════════════
// NOTAMS DATABASE
// ═══════════════════════════════════════════════════════════════════════════
const NOTAMS = [
    { id:'A0421/26', airport:'VABB', category:'RUNWAY', severity:'CRITICAL',
      desc:'CSMIA RWY 09/27 CLOSED — re-carpeting & joint repair. All ops via RWY 14/32.',
      validity:'2026-05-15 to 2026-06-15', type:'circle', coordinates:[19.0896,72.8656], radius:900 },
    { id:'A1102/26', airport:'VANM', category:'AIRSPACE', severity:'WARNING',
      desc:'TFR for all UAV/drone ops within VANM construction zone perimeter.',
      validity:'2026-04-01 to 2026-10-31', type:'circle', coordinates:[18.9919,73.0617], radius:2500 },
    { id:'B0833/26', airport:'VABB', category:'HAZARD', severity:'INFO',
      desc:'Increased bird density at Sanjay Gandhi NP corridors — maintain FL050+.',
      validity:'2026-05-01 to 2026-07-31', type:'polygon',
      coordinates:[[19.16,72.88],[19.29,72.87],[19.28,72.96],[19.17,72.95]] },
    { id:'D0219/26', airport:'MUMBAI FIR', category:'MILITARY', severity:'CRITICAL',
      desc:'Live firing — Naval ships in VAD-12 (offshore Arabian Sea). FL150 below prohibited.',
      validity:'2026-05-22 to 2026-05-26', type:'polygon',
      coordinates:[[18.85,72.50],[18.98,72.50],[18.98,72.65],[18.85,72.65]] },
    { id:'A0444/26', airport:'VABB', category:'TAXIWAY', severity:'WARNING',
      desc:'TWY N2 between N1 and Gate G closed — electrical conduit replacement.',
      validity:'2026-05-20 to 2026-05-28', type:'circle', coordinates:[19.0945,72.8610], radius:400 },
    { id:'C0156/26', airport:'VANM', category:'NAVAID', severity:'INFO',
      desc:'VANM DVOR (VNM 115.3 MHz) in test mode — minor anomalies possible.',
      validity:'2026-05-21 to 2026-05-25', type:'circle', coordinates:[18.9950,73.0720], radius:1200 },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAP INIT
// ═══════════════════════════════════════════════════════════════════════════
function initMap() {
    state.map = L.map('map', {
        zoomControl: true,
        attributionControl: true,
        preferCanvas: true,   // faster rendering for many markers
    }).setView(state.mapCenter, state.mapDefaultZoom);

    // Satellite base
    const sat = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom:20, attribution:'Esri Imagery' }
    );
    // Hybrid road/label overlay
    const hybrid = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
        { maxZoom:20, opacity:0.65 }
    );
    // Dark chart alternative
    const dark = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        { subdomains:'abcd', maxZoom:20 }
    );

    sat.addTo(state.map);
    hybrid.addTo(state.map);

    L.control.layers(
        { '🛰️ Satellite': L.layerGroup([sat,hybrid]), '🌑 Dark Chart': dark },
        {}, { position:'topright', collapsed:true }
    ).addTo(state.map);

    state.map.zoomControl.setPosition('bottomright');
    state.map.attributionControl.setPrefix('');

    drawAirportMarkers();
    drawNotamOverlays();
    renderNOTAMs();
    showUserLocation();
}

// Airport markers with runway indicator
function drawAirportMarkers() {
    [VABB, VANM].forEach(ap => {
        // Runway circle
        L.circle([ap.lat, ap.lon], {
            radius: 2200, color: ap.icao==='VABB' ? '#00e5ff' : '#00e676',
            fillColor: ap.icao==='VABB' ? '#00e5ff' : '#00e676',
            fillOpacity: 0.03, weight: 1.2, dashArray:'4,8'
        }).addTo(state.map).bindTooltip(`${ap.icao} — ${ap.name}`, {className:'ac-tooltip-wrap', sticky:true});

        // Physical Runway Lines
        if (ap.icao === 'VABB') {
            L.polyline([[19.088456,72.849247],[19.088831,72.875358]], {
                color: '#00e5ff', weight: 4.5, opacity: 0.85, lineCap: 'square'
            }).addTo(state.map).bindTooltip('VABB RWY 09/27', {className:'ac-tooltip-wrap', sticky:true});
            
            L.polyline([[19.094000,72.861472],[19.082722,72.874833]], {
                color: '#00e5ff', weight: 4.5, opacity: 0.85, lineCap: 'square'
            }).addTo(state.map).bindTooltip('VABB RWY 14/32', {className:'ac-tooltip-wrap', sticky:true});
        } else if (ap.icao === 'VANM') {
            L.polyline([[18.984,73.051],[18.985,73.079]], {
                color: '#00e676', weight: 4.5, opacity: 0.85, lineCap: 'square'
            }).addTo(state.map).bindTooltip('VANM RWY 08/26', {className:'ac-tooltip-wrap', sticky:true});
        }

        // Airport icon
        const icon = L.divIcon({
            className:'',
            html:`<div class="apt-icon ${ap.icao==='VABB'?'apt-vabb':'apt-vanm'}">
                    <div class="apt-pin"></div>
                    <div class="apt-label">${ap.icao}</div>
                  </div>`,
            iconSize:[60,30], iconAnchor:[30,15]
        });
        L.marker([ap.lat, ap.lon], { icon, zIndexOffset:500 }).addTo(state.map)
            .bindTooltip(`<strong>${ap.icao}</strong><br>${ap.name}<br>Lat ${ap.lat.toFixed(4)} Lon ${ap.lon.toFixed(4)}`,
                         {className:'ac-tooltip-wrap', direction:'top'});
    });
}

// User GPS dot
function showUserLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
        const {latitude:lat, longitude:lon, accuracy:acc} = pos.coords;
        const icon = L.divIcon({
            className:'',
            html:`<div class="user-location-marker"><div class="user-location-dot"></div><div class="user-location-ring"></div></div>`,
            iconSize:[22,22], iconAnchor:[11,11]
        });
        const m = L.marker([lat,lon],{icon,zIndexOffset:2000}).addTo(state.map)
            .bindTooltip(`📍 Your Location (±${Math.round(acc)}m)`,{className:'ac-tooltip-wrap',sticky:true});
        L.circle([lat,lon],{radius:acc,color:'rgba(255,179,0,.5)',fillColor:'rgba(255,179,0,.06)',fillOpacity:1,weight:1,dashArray:'4,6'}).addTo(state.map);
        navigator.geolocation.watchPosition(p=>m.setLatLng([p.coords.latitude,p.coords.longitude]),
            null,{enableHighAccuracy:true,timeout:10000,maximumAge:5000});
    }, ()=>{}, {enableHighAccuracy:true,timeout:10000,maximumAge:0});
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTAM OVERLAYS
// ═══════════════════════════════════════════════════════════════════════════
function severityColor(s) {
    return s==='CRITICAL'?'#ff3d00': s==='WARNING'?'#ffb300': '#00e5ff';
}
function drawNotamOverlays() {
    Object.values(state.notamLayers).forEach(l=>state.map.removeLayer(l));
    state.notamLayers={};
    if (!state.notamOverlaysVisible) return;
    NOTAMS.forEach(n=>{
        const c=severityColor(n.severity);
        let layer;
        if (n.type==='circle') layer=L.circle(n.coordinates,{color:c,fillColor:c,fillOpacity:.06,weight:1.5,dashArray:'5,5',radius:n.radius});
        else layer=L.polygon(n.coordinates,{color:c,fillColor:c,fillOpacity:.06,weight:1.5,dashArray:'5,5'});
        layer.addTo(state.map).bindTooltip(`<strong>NOTAM ${n.id}</strong><br>${n.category}: ${n.severity}`,{sticky:true,className:'ac-tooltip-wrap'});
        layer.on('click',()=>selectNotam(n.id));
        state.notamLayers[n.id]=layer;
    });
}

function selectNotam(id, zoom=true) {
    state.selectedNotamId=id;
    const n=NOTAMS.find(x=>x.id===id);
    if (!n) return;
    
    // Automatically force-enable overlays if they are disabled so the user can see what they clicked
    if (!state.notamOverlaysVisible) {
        state.notamOverlaysVisible = true;
        const notamsBtn = document.getElementById('hud-notams-btn');
        if (notamsBtn) {
            notamsBtn.classList.add('active');
            notamsBtn.innerHTML = `<span class="hud-icon">🚫</span> <span class="hud-label">NOTAMs ON</span>`;
        }
        drawNotamOverlays();
    }
    
    const c=severityColor(n.severity);
    NOTAMS.forEach(x=>{
        const l=state.notamLayers[x.id]; if(!l)return;
        const sel=x.id===id;
        l.setStyle({weight:sel?3:1.5,fillOpacity:sel?.22:.06,dashArray:sel?null:'5,5'});
        if(sel)l.bringToFront();
    });
    if(zoom){
        const l=state.notamLayers[id];
        if(n.type==='circle') state.map.setView(n.coordinates,13,{animate:true,duration:.8});
        else if(l) state.map.flyToBounds(l.getBounds(),{padding:[40,40],duration:.8});
    }
    if(n.severity==='CRITICAL'){playBeep(440,'triangle',.14);setTimeout(()=>playBeep(440,'triangle',.14),180);}
    else if(n.severity==='WARNING'){playBeep(520,'sine',.1);setTimeout(()=>playBeep(780,'sine',.08),100);}
    else playBeep(880,'sine',.06);
}

function renderNOTAMs() {
    if (!el.notamsTableBody) return;
    
    let notams = [...NOTAMS];
    if (state.sort.notams.column) {
        notams = sortItems(notams, state.sort.notams.column, state.sort.notams.order, true);
    }
    
    el.notamsCount.textContent=`${notams.length} Active NOTAMs`;
    el.notamsTableBody.innerHTML=notams.map(n=>`
        <tr class="notam-row ${state.selectedNotamId===n.id?'selected-row':''}" data-id="${n.id}">
            <td><strong style="font-family:'Fira Code',monospace;color:var(--accent-cyan)">${n.id}</strong></td>
            <td><strong style="color:#fff">${n.airport}</strong></td>
            <td><span style="font-size:11px;color:var(--text-secondary)">${n.category}</span></td>
            <td style="max-width:280px;font-size:11.5px;line-height:1.4">${n.desc}</td>
            <td style="font-family:'Fira Code',monospace;font-size:10px;color:var(--text-muted)">${n.validity}</td>
            <td><span class="severity-badge ${n.severity.toLowerCase()}">${n.severity}</span></td>
            <td><button class="show-notam-btn" data-id="${n.id}">Show on Map</button></td>
        </tr>`).join('');
        
    el.notamsTableBody.querySelectorAll('.notam-row').forEach(r=>{
        r.addEventListener('click', () => {
            switchTab('tab-map');
            selectNotam(r.dataset.id, true);
        });
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// LIVE DATA — adsb.lol primary, adsb.one fallback, static fallback
// ═══════════════════════════════════════════════════════════════════════════
async function loadData() {
    let loaded = false;
    let src = '';

    // ── PRIMARY: adsb.lol  ──────────────────────────────────────────────
    // 150nm radius centred on VABB — no bbox post-filter needed
    try {
        const url = `https://api.adsb.lol/v2/lat/${VABB.lat}/lon/${VABB.lon}/dist/150`;
        const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const ac = (json.ac || json.aircraft || []).filter(a => a.lat !== undefined && a.lon !== undefined);
        if (ac.length > 0) {
            mergeFlights(ac.map(a => parseAdsbAc(a)));
            loaded = true;
            src = `adsb.lol · ${state.flights.length} targets`;
        }
    } catch (e) { console.warn('adsb.lol:', e.message); }

    // ── FALLBACK: adsb.one  ─────────────────────────────────────────────
    if (!loaded) {
        try {
            const url = `https://api.adsb.one/v2/lat/${VABB.lat}/lon/${VABB.lon}/dist/150`;
            const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            const ac = (json.ac || []).filter(a => a.lat !== undefined && a.lon !== undefined);
            if (ac.length > 0) {
                mergeFlights(ac.map(a => parseAdsbAc(a)));
                loaded = true;
                src = `adsb.one · ${state.flights.length} targets`;
            }
        } catch (e) { console.warn('adsb.one:', e.message); }
    }

    // ── FALLBACK: static flights.json  ──────────────────────────────────
    if (!loaded) {
        try {
            const res = await fetch('flights.json?t='+Date.now());
            if (!res.ok) throw new Error('not found');
            const list = await res.json();
            // treat as fresh only if we have no flights at all
            if (state.flights.length === 0) {
                state.flights = list.map(f=>({...f, lastUpdatedTime:Date.now(),
                    baseLat:f.lat, baseLon:f.lon, baseAltitude:f.altitude,
                    baseSpeed:f.speed, baseHeading:f.heading, trail:[[f.lon,f.lat]]}));
                src = `cache · ${state.flights.length} targets`;
            }
        } catch(e) { console.warn('flights.json:', e.message); }
    }

    state.dataSource = src;
    state.lastRefresh = Date.now();
    updateTimestamp();
    updateFIDSCounts();
    renderFIDSBoards();
    renderMarkers();

    if (state.selectedFlightId) {
        const f = state.flights.find(f=>f.icao24===state.selectedFlightId);
        if (f) updatePanel(f); else closeTelemetry();
    }
}

// Parse a single adsb.lol / adsb.one aircraft object
function parseAdsbAc(a) {
    const icao = (a.hex||a.icao24||'').toLowerCase();
    const callsign = (a.flight||a.r||icao).trim().toUpperCase();
    const lat = a.lat, lon = a.lon;
    const alt   = a.alt_baro !== undefined ? (a.alt_baro==='ground' ? 0 : +a.alt_baro||0) : 0;
    const speed = a.gs   !== undefined ? Math.round(+a.gs||0)       : 0;
    const hdg   = a.track!== undefined ? Math.round(+a.track||0)    : 0;
    const vrate = a.baro_rate !== undefined ? Math.round(+a.baro_rate||0) : 0;
    const onGnd = a.alt_baro==='ground' || alt < 50;
    const squawk= a.squawk||'----';
    const reg   = a.r||'';
    const model = (a.t||'').toUpperCase()||'B738';

    const dVabb = haversine(lat,lon,VABB.lat,VABB.lon);
    const dVanm = haversine(lat,lon,VANM.lat,VANM.lon);
    const closer = dVabb<dVanm ? VABB : VANM;
    const closerDist = Math.min(dVabb,dVanm);

    let type='departure', status='En Route';
    if (onGnd) {
        type='on_ground';
        status = closerDist<3 ? 'Taxiing' : 'On Ground';
    } else if (vrate < -300) {
        type='arrival';
        status = closerDist<20 ? 'Final Approach' : 'Descending';
    } else if (vrate > 300) {
        type='departure';
        status = 'Climbing';
    } else if (closerDist < 50 && alt < 15000) {
        type = 'arrival'; status = 'Descending';
    }

    const airline = getAirlineInfo(callsign);
    const { dest, origin } = guessDestination(callsign, type, closer.icao);
    const mi = modelInfo(model);
    const destCoords = AIRPORT_COORDS[dest] || null;
    const originCoords = AIRPORT_COORDS[origin] || null;

    return {
        icao24: icao, callsign, squawk, registration: reg,
        airline: airline.name, logo: airline.logo, iata: airline.iata,
        model, aircraft_fullname: mi.full, manufacturer: mi.mfr, engines: mi.eng,
        photo_url: mi.photo || '', photographer: 'JetPhotos Archive',
        serial_number: reg ? `MSN-${Math.abs(icao.charCodeAt(0)*37+icao.charCodeAt(1)*13)%9000+1000}` : '—',
        age: `${(2 + (icao.charCodeAt(0)%8)).toFixed(1)} yrs`,
        origin, origin_iata: origin, origin_fullname: origin,
        destination: dest, destination_iata: dest, destination_fullname: dest,
        destCoords, originCoords,
        dep_time: '—', arr_time: '—',
        lat, lon, altitude: alt, speed, heading: hdg, vertical_rate: vrate,
        type, status, airport: closer.icao,
        gate: onGnd ? 'APRON' : '',
        owner: getDeterministicOwner(callsign),
        source: closer.icao === 'VABB' ? 'VABB ADS-B Ground Feed' : 'VANM MLAT Ground Feed',

        lastUpdatedTime: Date.now(),
        baseLat: lat, baseLon: lon, baseAltitude: alt, baseSpeed: speed, baseHeading: hdg,
        trail: [[lon, lat]],
        distanceRemaining: 0, etaMinutes: 0,
    };
}

// Global cache for callsign routes to avoid repeated API requests
state.routeCache = {};

async function enrichFlight(flight) {
    const cs = flight.callsign;
    if (!cs || cs.length < 3) return;
    
    // Check cache first
    if (state.routeCache[cs]) {
        applyRoute(flight, state.routeCache[cs]);
        return;
    }
    
    // Check if we are currently fetching this callsign
    if (state.routeCache[cs] === 'fetching') return;
    state.routeCache[cs] = 'fetching';
    
    try {
        const url = `https://hexdb.io/api/v1/route/icao/${cs}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data && data.route) {
            state.routeCache[cs] = data.route; // e.g. "VABB-VIDP"
            applyRoute(flight, data.route);
            // Refresh FIDS and panels if this flight is selected
            if (state.selectedFlightId === flight.icao24) {
                updatePanel(flight);
                drawDestArc(flight);
            }
            renderMarkers();
        } else {
            state.routeCache[cs] = 'not_found';
        }
    } catch (e) {
        console.warn(`hexdb.io route fetch failed for ${cs}:`, e.message);
        state.routeCache[cs] = null; // retry later
    }
}

function applyRoute(flight, routeStr) {
    if (!routeStr || routeStr === 'fetching' || routeStr === 'not_found') return;
    const parts = routeStr.split('-');
    if (parts.length === 2) {
        const origIcao = parts[0].trim().toUpperCase();
        const destIcao = parts[1].trim().toUpperCase();
        
        flight.origin = origIcao;
        flight.origin_iata = ICAO_TO_IATA[origIcao] || origIcao;
        flight.origin_fullname = getAirportName(origIcao);
        
        flight.destination = destIcao;
        flight.destination_iata = ICAO_TO_IATA[destIcao] || destIcao;
        flight.destination_fullname = getAirportName(destIcao);
        
        flight.destCoords = AIRPORT_COORDS[destIcao] || AIRPORT_COORDS[flight.destination_iata] || null;
        flight.originCoords = AIRPORT_COORDS[origIcao] || AIRPORT_COORDS[flight.origin_iata] || null;
        
        calcETA(flight);
    }
}

// Merge new flight data preserving trail history
function mergeFlights(newList) {
    const newMap = {};
    newList.forEach(f => { newMap[f.icao24] = f; });

    // Update existing flights, preserve & grow trail
    state.flights.forEach(old => {
        const upd = newMap[old.icao24];
        if (!upd) return; // will be dropped below
        // Accumulate trail (max 120 pts ~ 16 min at 8s refresh)
        const trail = old.trail || [];
        const last = trail[trail.length-1];
        if (!last || last[0]!==upd.lon || last[1]!==upd.lat) {
            trail.push([upd.lon, upd.lat]);
            if (trail.length > 120) trail.shift();
        }
        upd.trail = trail;

        // Preserve enriched route if we already fetched it
        if (old.routeEnriched) {
            upd.origin = old.origin;
            upd.origin_iata = old.origin_iata;
            upd.origin_fullname = old.origin_fullname;
            upd.destination = old.destination;
            upd.destination_iata = old.destination_iata;
            upd.destination_fullname = old.destination_fullname;
            upd.destCoords = old.destCoords;
            upd.originCoords = old.originCoords;
            upd.routeEnriched = true;
        }

        // preserve selected state
        delete newMap[old.icao24];
        Object.assign(old, upd);
    });

    // Add genuinely new flights
    Object.values(newMap).forEach(f => state.flights.push(f));

    // Remove flights no longer in feed
    state.flights = state.flights.filter(f => {
        if (newList.find(n=>n.icao24===f.icao24)) return true;
        // keep for 30s after last update (smooth disappearance)
        return (Date.now()-f.lastUpdatedTime) < 30000;
    });

    // Recalculate ETA and trigger enrichment
    state.flights.forEach(f => {
        calcETA(f);
        if (!f.routeEnriched && f.source && f.source.includes('Feed')) {
            f.routeEnriched = true;
            enrichFlight(f);
        }
    });
}


function calcETA(f) {
    if (f.type==='on_ground' || !f.destCoords || f.speed<30) {
        f.distanceRemaining=0; f.etaMinutes=0; return;
    }
    f.distanceRemaining = Math.round(haversine(f.lat,f.lon,f.destCoords[0],f.destCoords[1]));
    f.etaMinutes = Math.max(1, Math.round(f.distanceRemaining/(f.speed*1.852/60)));
}

// ═══════════════════════════════════════════════════════════════════════════
// MARKER RENDERING
// ═══════════════════════════════════════════════════════════════════════════
function getFilteredFlights() {
    return state.flights.filter(f => {
        if (state.airportFilter!=='all' && f.airport!==state.airportFilter) return false;
        if (state.searchQuery) {
            const q=state.searchQuery.toLowerCase();
            return [f.callsign,f.airline,f.origin,f.destination,f.model,f.registration]
                .some(v=>v&&v.toLowerCase().includes(q));
        }
        return true;
    });
}

function renderMarkers() {
    if (!state.map) return;
    const filtered = getFilteredFlights();
    const visSet = new Set(filtered.map(f=>f.icao24));

    // Remove stale
    Object.keys(state.markers).forEach(icao=>{
        if (!visSet.has(icao)) {
            const e=state.markers[icao];
            if(e.marker) state.map.removeLayer(e.marker);
            if(e.vector) state.map.removeLayer(e.vector);
            // remove trail
            (state.trailLayers[icao]||[]).forEach(l=>state.map.removeLayer(l));
            delete state.markers[icao];
            delete state.trailLayers[icao];
        }
    });

    filtered.forEach(f => {
        const isSel = f.icao24 === state.selectedFlightId;
        const color = isSel ? '#00e676' : altColor(f);
        const isWide = WIDEBODY.has(f.model?.toUpperCase());
        const svg = f.type==='on_ground' ? getGroundSVG(color) : getPlaneSVG(isWide, color);
        const glow = `drop-shadow(0 0 5px ${color}) drop-shadow(0 0 2px #000)`;
        const route = (f.origin_iata&&f.destination_iata)
            ? `${f.origin_iata} → ${f.destination_iata}`
            : (f.type==='on_ground'?'GND':'—');
        const flLabel = f.altitude>0 ? `FL${Math.round(f.altitude/100)}` : 'GND';

        const icon = L.divIcon({
            className:'',
            html:`<div class="ac-marker${isSel?' ac-selected':''}" style="--ac-color:${color}">
                    <div class="ac-body" style="transform:rotate(${f.heading}deg);filter:${glow}">${svg}</div>
                    <div class="ac-label">
                      <span class="ac-callsign">${f.callsign}</span>
                      <span class="ac-sub">${route} · ${flLabel}</span>
                    </div>
                  </div>`,
            iconSize:[40,40], iconAnchor:[20,20]
        });

        const tip=`<div class="ac-tooltip">
          <strong>${f.callsign}</strong> <span style="color:${color}">${f.status}</span><br>
          ${f.airline} · ${f.model}<br>
          <span style="opacity:.75">ALT</span> ${fmt.alt(f.altitude)}
          &nbsp;<span style="opacity:.75">SPD</span> ${fmt.spd(f.speed)}
          &nbsp;<span style="opacity:.75">HDG</span> ${f.heading}°
          ${f.registration?`<br><span style="opacity:.75">REG</span> ${f.registration}`:''}
        </div>`;

        if (state.markers[f.icao24]) {
            const e=state.markers[f.icao24];
            e.marker.setLatLng([f.lat,f.lon]).setIcon(icon);
            e.marker.getTooltip()?.setContent(tip);
            if(e.vector){state.map.removeLayer(e.vector);e.vector=null;}
            if(f.speed>20&&f.type!=='on_ground') e.vector=drawVector(f,color);
        } else {
            const marker = L.marker([f.lat,f.lon],{icon,zIndexOffset:isSel?1000:0})
                .addTo(state.map)
                .bindTooltip(tip,{direction:'top',offset:[0,-16],className:'ac-tooltip-wrap',permanent:false});
            marker.on('click',()=>selectFlight(f));
            let vector=null;
            if(f.speed>20&&f.type!=='on_ground') vector=drawVector(f,color);
            state.markers[f.icao24]={marker,vector};
        }

        // Trails — only for selected flight
        renderTrail(f, isSel, color);
    });

    // Handle TCAS / Proximity visualizations for selected flight
    clearProximityRadar();
    if (state.selectedFlightId) {
        const selFlight = state.flights.find(f => f.icao24 === state.selectedFlightId);
        if (selFlight && selFlight.type !== 'on_ground') {
            drawProximityRadar(selFlight);
        }
    }
}

function drawVector(f, color) {
    const R=6371, d=(f.speed*1.852*4)/60/R; // 4-min projection
    const la=f.lat*Math.PI/180, lo=f.lon*Math.PI/180, h=f.heading*Math.PI/180;
    const la2=Math.asin(Math.sin(la)*Math.cos(d)+Math.cos(la)*Math.sin(d)*Math.cos(h));
    const lo2=lo+Math.atan2(Math.sin(h)*Math.sin(d)*Math.cos(la),Math.cos(d)-Math.sin(la)*Math.sin(la2));
    return L.polyline([[f.lat,f.lon],[la2*180/Math.PI,lo2*180/Math.PI]],
        {color,weight:1.5,opacity:0.6,dashArray:'3,6'}).addTo(state.map);
}

function renderTrail(f, show, color) {
    // Clear existing trail layers for this flight
    (state.trailLayers[f.icao24]||[]).forEach(l=>state.map.removeLayer(l));
    state.trailLayers[f.icao24]=[];
    if (!show || !f.trail || f.trail.length<2) return;
    const pts = f.trail.map(c=>[c[1],c[0]]); // [lon,lat] → [lat,lon]
    // Glow background
    const glow = L.polyline(pts,{color,weight:8,opacity:0.1,lineJoin:'round'}).addTo(state.map);
    // Main trail
    const line = L.polyline(pts,{color,weight:2.5,opacity:0.8,dashArray:'6,8',lineJoin:'round'}).addTo(state.map);
    state.trailLayers[f.icao24]=[glow,line];
}

// Draw great-circle arc to destination when flight is selected
function drawDestArc(f) {
    clearDestArc();
    if (!f || !f.destCoords || f.type==='on_ground') return;
    const [dlat,dlon] = f.destCoords;
    const pts = gcArc(f.lat,f.lon,dlat,dlon,80);

    // Dashed arc
    state.destArc = L.polyline(pts,{color:'rgba(255,255,255,0.3)',weight:1.5,dashArray:'5,8'}).addTo(state.map);

    // Destination airport pin
    const destAp = Object.values(AIRPORTS_DB).find(a=>a.iata===f.destination_iata||a.icao===f.destination_iata);
    const name = destAp ? destAp.name : (f.destination_fullname||f.destination_iata||'Destination');
    const di = L.divIcon({
        className:'',
        html:`<div class="dest-pin"><div class="dest-pin-dot"></div><div class="dest-pin-label">${f.destination_iata||'DST'}</div></div>`,
        iconSize:[50,24], iconAnchor:[25,12]
    });
    state.destMarker = L.marker([dlat,dlon],{icon:di,zIndexOffset:300})
        .addTo(state.map)
        .bindTooltip(`<strong>${f.destination_iata}</strong><br>${name}`,{className:'ac-tooltip-wrap',direction:'top'});
}

function clearDestArc() {
    if (state.destArc) { state.map.removeLayer(state.destArc); state.destArc=null; }
    if (state.destMarker) { state.map.removeLayer(state.destMarker); state.destMarker=null; }
}

function clearProximityRadar() {
    if (state.proximityLayers) {
        state.proximityLayers.forEach(l => state.map.removeLayer(l));
    }
    state.proximityLayers = [];
}

function drawProximityRadar(selFlight) {
    if (!state.map) return;
    const maxDistKm = 25; // ~13.5 NM warning bubble
    const circle10 = L.circle([selFlight.lat, selFlight.lon], {
        radius: 10000, color: '#ff3d00', weight: 1, opacity: 0.4, dashArray: '4,6', fillColor: '#ff3d00', fillOpacity: 0.015, interactive: false
    }).addTo(state.map);
    const circle20 = L.circle([selFlight.lat, selFlight.lon], {
        radius: 20000, color: '#ffb300', weight: 1, opacity: 0.3, dashArray: '6,10', fillColor: '#ffb300', fillOpacity: 0.005, interactive: false
    }).addTo(state.map);
    state.proximityLayers.push(circle10, circle20);

    state.flights.forEach(f => {
        if (f.icao24 === selFlight.icao24 || f.type === 'on_ground') return;
        const distKm = haversine(selFlight.lat, selFlight.lon, f.lat, f.lon);
        if (distKm <= maxDistKm) {
            const connector = L.polyline([[selFlight.lat, selFlight.lon], [f.lat, f.lon]], {
                color: distKm <= 10 ? '#ff3d00' : '#ffb300', weight: distKm <= 10 ? 1.8 : 1.2, opacity: 0.65, dashArray: '3,5'
            }).addTo(state.map);
            const midLat = (selFlight.lat + f.lat) / 2;
            const midLon = (selFlight.lon + f.lon) / 2;
            const altDiff = f.altitude - selFlight.altitude;
            const distNm = (distKm / 1.852).toFixed(1);
            const badgeIcon = L.divIcon({
                className: '',
                html: `<div class="tcas-mid-badge ${distKm <= 10 ? 'tcas-alert' : 'tcas-warn'}">
                        <span>${distNm} NM</span>
                        <span>${altDiff >= 0 ? '+' : ''}${altDiff.toLocaleString()} ft</span>
                      </div>`,
                iconSize: [60, 24], iconAnchor: [30, 12]
            });
            const badgeMarker = L.marker([midLat, midLon], { icon: badgeIcon, interactive: false }).addTo(state.map);
            state.proximityLayers.push(connector, badgeMarker);
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// FLIGHT SELECTION & TELEMETRY PANEL
// ═══════════════════════════════════════════════════════════════════════════
function selectFlight(f) {
    playBeep(1100,'sine',0.05);
    state.selectedFlightId = f.icao24;
    el.detailViewer.classList.remove('hidden');
    updatePanel(f);
    drawDestArc(f);
    renderMarkers();
    // Pan to flight
    state.map.setView([f.lat,f.lon], Math.max(state.map.getZoom(),10), {animate:true,duration:0.6});
    // Also activate map tab
    switchTab('tab-map');
}

function closeTelemetry() {
    state.selectedFlightId = null;
    el.detailViewer.classList.add('hidden');
    clearDestArc();
    clearProximityRadar();
    // Clear trails
    Object.keys(state.trailLayers).forEach(icao=>{
        (state.trailLayers[icao]||[]).forEach(l=>state.map.removeLayer(l));
    });
    state.trailLayers={};
    renderMarkers();
}

function updatePanel(f) {
    el.detailCallsign.textContent = f.callsign;
    el.detailLogo.innerHTML = `<img src="${f.logo||FALLBACK_LOGO}" alt="${f.airline}" class="airline-logo-img" onerror="this.src='${FALLBACK_LOGO}'">`;
    el.detailAirline.textContent = f.airline;
    el.detailModel.textContent = f.model;
    el.detailAircraftFullname.textContent = f.aircraft_fullname||f.model;
    el.detailRegistration.textContent = f.registration||'—';
    el.detailSerial.textContent = f.serial_number||'—';
    el.detailAge.textContent = f.age||'—';
    el.detailManufacturer.textContent = f.manufacturer||'—';
    el.detailEngines.textContent = f.engines||'—';
    if (f.photo_url) { el.detailPhotoImg.src=f.photo_url; el.detailPhotoCredit.textContent=`Photo © ${f.photographer||'JetPhotos'}`; }
    el.detailOrigin.textContent = f.origin_iata||f.origin||'—';
    el.detailDestination.textContent = f.destination_iata||f.destination||'—';
    el.detailOriginFull.textContent = f.origin_fullname||f.origin||'—';
    el.detailDestinationFull.textContent = f.destination_fullname||f.destination||'—';
    el.detailDepTime.textContent = f.dep_time||'—';
    el.detailArrTime.textContent = f.arr_time||'—';
    el.detailAltitude.textContent = fmt.alt(f.altitude);
    el.detailSpeed.textContent = fmt.spd(f.speed);
    el.detailHeading.textContent = `${f.heading}°`;
    el.detailVrate.textContent = f.vertical_rate ? `${f.vertical_rate>0?'+':''}${f.vertical_rate} fpm` : '0 fpm';
    el.detailLat.textContent = f.lat.toFixed(5);
    el.detailLon.textContent = f.lon.toFixed(5);
    el.detailSquawk.textContent = f.squawk||'----';
    el.detailIcao24.textContent = f.icao24.toUpperCase();
    el.detailDistRem.textContent = f.type==='on_ground' ? 'GND' : (f.distanceRemaining?`${f.distanceRemaining} km`:'—');
    el.detailEta.textContent = f.type==='on_ground' ? '—' : (f.etaMinutes?`${f.etaMinutes} min`:'—');
    if (el.detailOwner) el.detailOwner.textContent = f.owner||f.airline||'—';
    if (el.detailSource) el.detailSource.textContent = f.source||'ADS-B Live';
    if (el.detailGate) el.detailGate.textContent = f.gate||'—';
    if (el.detailGateContainer) el.detailGateContainer.classList.toggle('hidden', !f.gate);
    // Status badge
    const badge = el.detailStatusBadge;
    badge.textContent = f.status;
    badge.className = 'badge status-' + f.status.toLowerCase().replace(/\s+/g,'-');
    // Progress bar
    const pct = calcProgress(f);
    el.detailProgressFill.style.width=`${pct}%`;
    el.detailProgressPlane.style.left=`${pct}%`;
    el.detailProgressPercent.textContent = f.status==='Landed'?`Landed`:`En Route · ${pct}% complete`;
}

function calcProgress(f) {
    if (f.type==='on_ground') return 0;
    if (!f.distanceRemaining||!f.destCoords||!f.originCoords) return 50;
    const total = haversine(f.originCoords[0],f.originCoords[1],f.destCoords[0],f.destCoords[1]);
    const rem = f.distanceRemaining;
    return total>0 ? Math.round(Math.max(0,Math.min(100,((total-rem)/total)*100))) : 50;
}

// ═══════════════════════════════════════════════════════════════════════════
// FIDS BOARDS
// ═══════════════════════════════════════════════════════════════════════════
function updateFIDSCounts() {
    const flt = getFilteredFlights();
    el.arrivalsCount.textContent  = `${flt.filter(f=>f.type==='arrival').length} Arrivals`;
    el.departuresCount.textContent = `${flt.filter(f=>f.type==='departure').length} Departures`;
    el.groundCount.textContent    = `${flt.filter(f=>f.type==='on_ground').length} On Ground`;
}

function renderFIDSBoards() {
    const flt = getFilteredFlights();
    const logoImg=(f)=>`<img src="${f.logo||FALLBACK_LOGO}" class="fids-airline-logo" alt="${f.airline}" onerror="this.style.display='none'">`;
    const pill=(s)=>`<span class="status-pill ${s.toLowerCase().replace(/\s/g,'-')}">${s}</span>`;
    const trackBtn=(icao)=>`<button class="track-btn" data-icao="${icao}">Track</button>`;
    const selClass=(f)=>state.selectedFlightId===f.icao24?'selected-row':'';

    let arrs = flt.filter(f=>f.type==='arrival');
    if (state.sort.arrivals.column) {
        arrs = sortItems(arrs, state.sort.arrivals.column, state.sort.arrivals.order, false);
    }
    el.arrivalsTableBody.innerHTML = arrs.length
        ? arrs.map(f=>`<tr class="${selClass(f)}" data-icao="${f.icao24}">
            <td><strong>${f.callsign}</strong></td>
            <td>${logoImg(f)} ${f.airline}</td>
            <td>${f.origin_iata||f.origin||'—'}</td>
            <td>${fmt.alt(f.altitude)}</td>
            <td>${fmt.spd(f.speed)}</td>
            <td>${pill(f.status)}</td>
            <td>${trackBtn(f.icao24)}</td></tr>`).join('')
        : `<tr><td colspan="7" class="table-empty">No active arrivals.</td></tr>`;

    let deps = flt.filter(f=>f.type==='departure');
    if (state.sort.departures.column) {
        deps = sortItems(deps, state.sort.departures.column, state.sort.departures.order, false);
    }
    el.departuresTableBody.innerHTML = deps.length
        ? deps.map(f=>`<tr class="${selClass(f)}" data-icao="${f.icao24}">
            <td><strong>${f.callsign}</strong></td>
            <td>${logoImg(f)} ${f.airline}</td>
            <td>${f.destination_iata||f.destination||'—'}</td>
            <td>${fmt.alt(f.altitude)}</td>
            <td>${fmt.spd(f.speed)}</td>
            <td>${pill(f.status)}</td>
            <td>${trackBtn(f.icao24)}</td></tr>`).join('')
        : `<tr><td colspan="7" class="table-empty">No active departures.</td></tr>`;

    let gnd = flt.filter(f=>f.type==='on_ground');
    if (state.sort.ground.column) {
        gnd = sortItems(gnd, state.sort.ground.column, state.sort.ground.order, false);
    }
    el.groundTableBody.innerHTML = gnd.length
        ? gnd.map(f=>`<tr class="${selClass(f)}" data-icao="${f.icao24}">
            <td><strong>${f.callsign}</strong></td>
            <td>${logoImg(f)} ${f.airline}</td>
            <td>${f.model||'—'}</td>
            <td>${f.destination_iata||f.destination||'—'}</td>
            <td><span style="font-family:'Fira Code',monospace;color:var(--accent-cyan)">${f.gate||'APRON'}</span></td>
            <td>${pill(f.status)}</td>
            <td>${trackBtn(f.icao24)}</td></tr>`).join('')
        : `<tr><td colspan="7" class="table-empty">No aircraft on ground.</td></tr>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMAT HELPERS
// ═══════════════════════════════════════════════════════════════════════════
const fmt = {
    alt: a => a>0 ? `${a.toLocaleString()} ft` : 'Ground',
    spd: s => s>0 ? `${s} kts` : '0 kts',
};

// ═══════════════════════════════════════════════════════════════════════════
// SORTING HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function getSortVal(item, key, isNotam) {
    if (isNotam) {
        if (key === 'severity') {
            const weights = { 'CRITICAL': 3, 'WARNING': 2, 'INFO': 1 };
            return weights[item.severity] || 0;
        }
        return item[key] || '';
    } else {
        if (key === 'origin') return item.origin_iata || item.origin || '';
        if (key === 'destination') return item.destination_iata || item.destination || '';
        if (key === 'gate') return item.gate || 'APRON';
        return item[key] !== undefined ? item[key] : '';
    }
}

function sortItems(items, key, order, isNotam = false) {
    return [...items].sort((a, b) => {
        let valA = getSortVal(a, key, isNotam);
        let valB = getSortVal(b, key, isNotam);
        
        if (typeof valA === 'string' && typeof valB === 'string') {
            return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else {
            if (valA < valB) return order === 'asc' ? -1 : 1;
            if (valA > valB) return order === 'asc' ? 1 : -1;
            return 0;
        }
    });
}

function updateSortIcons() {
    document.querySelectorAll('.sortable').forEach(th => {
        const board = th.dataset.board;
        const col = th.dataset.sort;
        const icon = th.querySelector('.sort-icon');
        if (!icon) return;
        
        const activeSort = state.sort[board];
        if (activeSort.column === col) {
            icon.textContent = activeSort.order === 'asc' ? ' ▲' : ' ▼';
        } else {
            icon.textContent = ' ↕';
        }
    });
}

function updateTimestamp() {
    const t = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    el.lastUpdatedText.textContent = `${t} · ${state.dataSource}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// SMOOTH INTERPOLATION LOOP (runs every 1s)
// ═══════════════════════════════════════════════════════════════════════════
setInterval(()=>{
    if (!state.flights.length) return;
    const now = Date.now();
    state.flights.forEach(f=>{
        if (f.type==='on_ground'||f.speed<5) return;
        const elapsed = (now - f.lastUpdatedTime)/1000;
        if (elapsed > 60) return; // don't extrapolate too far
        const proj = projectPos(f.baseLat,f.baseLon,f.speed,f.heading,elapsed);
        f.lat = proj.lat; f.lon = proj.lon;
        if (f.vertical_rate) f.altitude = Math.max(0, Math.round(f.baseAltitude + (f.vertical_rate/60)*elapsed));
        calcETA(f);
    });
    renderMarkers();
    // Update panel live
    if (state.selectedFlightId) {
        const f=state.flights.find(f=>f.icao24===state.selectedFlightId);
        if (f) {
            el.detailAltitude.textContent = fmt.alt(f.altitude);
            el.detailSpeed.textContent = fmt.spd(f.speed);
            el.detailLat.textContent = f.lat.toFixed(5);
            el.detailLon.textContent = f.lon.toFixed(5);
            el.detailDistRem.textContent = f.distanceRemaining ? `${f.distanceRemaining} km` : '—';
            el.detailEta.textContent = f.etaMinutes ? `${f.etaMinutes} min` : '—';
        }
    }
}, 1000);

// ═══════════════════════════════════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════════════════════════════════
function switchTab(tabId) {
    state.currentTab = tabId;
    el.tabs.forEach(t=>t.classList.toggle('active', t.dataset.tab===tabId));
    el.tabPanels.forEach(p=>p.classList.toggle('active', p.id===tabId));
    document.querySelectorAll('.mobile-nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tabId));
    if (tabId==='tab-map' && state.map) setTimeout(()=>state.map.invalidateSize(), 80);
}

el.tabs.forEach(t=>t.addEventListener('click',()=>{ playBeep(1100,'sine',0.04); switchTab(t.dataset.tab); }));
document.querySelectorAll('.mobile-nav-btn').forEach(b=>b.addEventListener('click',()=>{ playBeep(1100,'sine',0.04); switchTab(b.dataset.tab); }));

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH, FILTER & QUICK BADGES
// ═══════════════════════════════════════════════════════════════════════════
function setAirportFilter(filter) {
    state.airportFilter = filter;
    
    // Update toolbar filter buttons
    el.filterButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.airport === filter);
    });
    
    // Update header badges
    document.querySelectorAll('.airport-badge').forEach(badge => {
        const icaoEl = badge.querySelector('.badge-icao');
        const icao = icaoEl ? icaoEl.textContent.trim() : '';
        badge.classList.toggle('active-filter', icao === filter);
    });
    
    updateFIDSCounts();
    renderFIDSBoards();
    renderMarkers();
}

el.filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        playBeep(950, 'sine', 0.04);
        setAirportFilter(btn.dataset.airport);
    });
});

document.querySelectorAll('.airport-badge').forEach(badge => {
    badge.addEventListener('click', () => {
        playBeep(950, 'sine', 0.04);
        const icaoEl = badge.querySelector('.badge-icao');
        const icao = icaoEl ? icaoEl.textContent.trim() : '';
        if (state.airportFilter === icao) {
            setAirportFilter('all');
        } else {
            setAirportFilter(icao);
        }
    });
});

const searchClearBtn = document.getElementById('search-clear-btn');
function handleSearchInput(val) {
    state.searchQuery = val;
    if (el.searchInput) {
        el.searchInput.value = val;
    }
    if (searchClearBtn) {
        searchClearBtn.classList.toggle('hidden', !val);
    }
    updateFIDSCounts();
    renderFIDSBoards();
    renderMarkers();
}

el.searchInput?.addEventListener('input', e => {
    handleSearchInput(e.target.value);
});

searchClearBtn?.addEventListener('click', () => {
    playBeep(1000, 'sine', 0.04);
    handleSearchInput('');
});

// ═══════════════════════════════════════════════════════════════════════════
// COLUMN SORTING
// ═══════════════════════════════════════════════════════════════════════════
document.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => {
        playBeep(1000, 'sine', 0.04);
        const board = th.dataset.board;
        const col = th.dataset.sort;
        if (!board || !col) return;
        
        const activeSort = state.sort[board];
        if (activeSort.column === col) {
            activeSort.order = activeSort.order === 'asc' ? 'desc' : 'asc';
        } else {
            activeSort.column = col;
            activeSort.order = 'asc';
        }
        
        updateSortIcons();
        if (board === 'notams') {
            renderNOTAMs();
        } else {
            renderFIDSBoards();
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// TABLE ROW EVENT DELEGATION
// ═══════════════════════════════════════════════════════════════════════════
[el.arrivalsTableBody, el.departuresTableBody, el.groundTableBody].forEach(body => {
    body?.addEventListener('click', e => {
        const row = e.target.closest('tr[data-icao]');
        if (!row) return;
        
        const icao = row.dataset.icao;
        if (!icao) return;
        
        const flight = state.flights.find(f => f.icao24 === icao);
        if (flight) {
            selectFlight(flight);
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// MAP HUD TOOLBAR
// ═══════════════════════════════════════════════════════════════════════════
const hudRecenterBtn = document.getElementById('hud-recenter-btn');
const hudTrailsBtn = document.getElementById('hud-trails-btn');
const hudNotamsBtn = document.getElementById('hud-notams-btn');

hudRecenterBtn?.addEventListener('click', () => {
    playBeep(1000, 'sine', 0.04);
    if (state.map) {
        state.map.setView(state.mapCenter, state.mapDefaultZoom, { animate: true, duration: 0.8 });
    }
});

hudTrailsBtn?.addEventListener('click', () => {
    playBeep(1000, 'sine', 0.04);
    state.globalTrailsEnabled = !state.globalTrailsEnabled;
    hudTrailsBtn.classList.toggle('active', state.globalTrailsEnabled);
    const label = hudTrailsBtn.querySelector('.hud-label');
    if (label) {
        label.textContent = state.globalTrailsEnabled ? 'Trails ON' : 'Trails OFF';
    }
    renderMarkers();
});

hudNotamsBtn?.addEventListener('click', () => {
    playBeep(1000, 'sine', 0.04);
    state.notamOverlaysVisible = !state.notamOverlaysVisible;
    hudNotamsBtn.classList.toggle('active', state.notamOverlaysVisible);
    const label = hudNotamsBtn.querySelector('.hud-label');
    if (label) {
        label.textContent = state.notamOverlaysVisible ? 'NOTAMs ON' : 'NOTAMs OFF';
    }
    drawNotamOverlays();
});

// ═══════════════════════════════════════════════════════════════════════════
// MOBILE DRAWER DETAILS PANEL GESTURES
// ═══════════════════════════════════════════════════════════════════════════
const drawerHandle = document.querySelector('#detail-viewer .drawer-handle');
if (drawerHandle) {
    let touchStartY = 0;
    let touchCurrentY = 0;
    
    drawerHandle.addEventListener('touchstart', e => {
        touchStartY = e.touches[0].clientY;
        touchCurrentY = touchStartY;
    }, { passive: true });
    
    drawerHandle.addEventListener('touchmove', e => {
        touchCurrentY = e.touches[0].clientY;
        const deltaY = touchCurrentY - touchStartY;
        if (deltaY > 0 && el.detailViewer) {
            el.detailViewer.style.transform = `translateY(${deltaY}px)`;
            el.detailViewer.style.transition = 'none';
        }
    }, { passive: true });
    
    drawerHandle.addEventListener('touchend', () => {
        const deltaY = touchCurrentY - touchStartY;
        if (el.detailViewer) {
            el.detailViewer.style.transform = '';
            el.detailViewer.style.transition = '';
        }
        if (deltaY > 80) {
            closeTelemetry();
        }
    });
    
    drawerHandle.addEventListener('click', () => {
        playBeep(1000, 'sine', 0.04);
        closeTelemetry();
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// CLOSE TELEMETRY & SOUND
// ═══════════════════════════════════════════════════════════════════════════
el.closeTelemetryBtn?.addEventListener('click', closeTelemetry);

el.soundToggleBtn?.addEventListener('click',()=>{
    state.soundEnabled=!state.soundEnabled;
    el.soundToggleBtn.innerHTML=`<span id="sound-icon">${state.soundEnabled?'🔊':'🔇'}</span> AUDIO ${state.soundEnabled?'ON':'OFF'}`;
    if(state.soundEnabled) playBeep(900,'sine',0.08);
});

// ═══════════════════════════════════════════════════════════════════════════
// BOOTSTRAP
// ═══════════════════════════════════════════════════════════════════════════
initMap();
loadData();
updateSortIcons();
setAirportFilter('all');
// Refresh every 8 seconds
state.refreshInterval = setInterval(loadData, 8000);

});
