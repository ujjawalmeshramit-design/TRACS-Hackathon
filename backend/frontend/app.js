/* ==========================================================================
   TRACS — Traffic Response & Control System
   Shared client-side logic for ALL pages (index, dashboard, deployment,
   dispatch, analytics). Each page loads this same file; every render
   function checks for its DOM hooks before running, so a given page only
   executes the sections relevant to it.

   Sections:
     1. Mock data (junctions, officers)
     2. Utilities (dom, formatting, badges, toast, PRNG)
     3. Graph + Dijkstra pathfinding (for Emergency Dispatch)
     4. Leaflet map helpers (heatmaps + marker maps)
     5. Page: Overview
     6. Page: Dashboard
     7. Page: Deployment
     8. Page: Dispatch
     9. Page: Analytics
     10. Boot
   ========================================================================== */

(function () {
  'use strict';

  /* ========================================================================
     1. MOCK DATA
     ========================================================================
     35 junctions across Nagpur City. Risk buckets: 6 high / 12 medium /
     17 low (matches the "Junctions by Risk Level" split shown on the
     Dashboard). Traffic condition mirrors risk (heavy/moderate/light).
  */


const JUNCTIONS = [
    // ---- HIGH RISK (6) ----
    j('J01', 'MG Road Junction',        'Central Nagpur',        21.1498, 79.0806, 'high',   85, 6, 3),
    j('J02', 'Central Square',          'Central Nagpur',        21.1466, 79.0849, 'high',   82, 6, 3),
    j('J03', 'Sadar Junction',          'Sadar',                 21.1600, 79.0729, 'high',   78, 5, 2),
    j('J04', 'Airport Junction',        'Sonegaon / Airport Rd', 21.0922, 79.0472, 'high',   74, 5, 2),
    j('J05', 'Medical Square',          'Medical Zone',          21.1329, 79.0784, 'high',   71, 4, 2),
    j('J06', 'Kamptee Road Junction',   'North Nagpur',          21.1848, 79.0975, 'high',   70, 4, 2),

    // ---- MEDIUM RISK (12) ----
    j('J07', 'Tech Park Junction',      'MIHAN / IT Park',       21.0700, 79.0470, 'medium', 68, 3, 1),
    j('J08', 'City Hospital Junction',  'Civil Lines',           21.1526, 79.0729, 'medium', 65, 3, 1),
    j('J09', 'University Junction',     'South Ambazari Rd',     21.1256, 79.0538, 'medium', 62, 3, 2),
    j('J10', 'Sitabuldi Junction',      'Sitabuldi',             21.1462, 79.0790, 'medium', 60, 3, 3),
    j('J11', 'Wardha Road Junction',    'Wardha Road',           21.1090, 79.0430, 'medium', 58, 3, 1),
    j('J12', 'Dharampeth Junction',     'Dharampeth',            21.1390, 79.0672, 'medium', 56, 3, 3),
    j('J13', 'Ramdaspeth Junction',     'Ramdaspeth',            21.1370, 79.0800, 'medium', 54, 3, 2),
    j('J14', 'Katol Road Junction',     'Katol Road',            21.1700, 79.0330, 'medium', 52, 3, 1),
    j('J15', 'Hingna Road Junction',    'Hingna',                21.1150, 79.0100, 'medium', 50, 3, 3),
    j('J16', 'Ajni Square',             'Ajni',                  21.1250, 79.0740, 'medium', 48, 3, 2),
    j('J17', 'Chhaoni Junction',        'Chhaoni',               21.1670, 79.0530, 'medium', 46, 3, 3),
    j('J18', 'Jaripatka Junction',      'Jaripatka',             21.1830, 79.0850, 'medium', 44, 3, 1),

    // ---- LOW RISK (17) ----
    j('J19', 'Trimurti Nagar Junction', 'Trimurti Nagar',        21.1330, 79.0330, 'low',    38, 1, 1),
    j('J20', 'Pratap Nagar Junction',   'Pratap Nagar',          21.1180, 79.0630, 'low',    36, 1, 1),
    j('J21', 'Manewada Road Junction',  'Manewada',              21.1070, 79.1080, 'low',    34, 1, 1),
    j('J22', 'Amravati Road Junction',  'Highway Corridor',      21.1750, 79.0180, 'low',    33, 1, 1),
    j('J23', 'Besa Junction',           'Besa',                  21.0950, 79.0930, 'low',    32, 1, 0),
    j('J24', 'Wathoda Junction',        'Wathoda',               21.1650, 79.1200, 'low',    30, 1, 1),
    j('J25', 'Somalwada Junction',      'Somalwada',             21.1180, 79.0330, 'low',    29, 1, 1),
    j('J26', 'Friends Colony Junction', 'Friends Colony',        21.1550, 79.1150, 'low',    28, 1, 0),
    j('J27', 'Byramji Town Junction',   'Byramji Town',           21.1780, 79.0680, 'low',    27, 1, 1),
    j('J28', 'Laxmi Nagar Junction',    'Laxmi Nagar',            21.1330, 79.0930, 'low',    26, 1, 1),
    j('J29', 'Shankar Nagar Junction',  'Shankar Nagar',          21.1420, 79.0630, 'low',    25, 1, 0),
    j('J30', 'Congress Nagar Junction', 'Congress Nagar',         21.1480, 79.0600, 'low',    24, 1, 1),
    j('J31', 'Nandanvan Junction',      'Nandanvan',              21.1180, 79.1200, 'low',    23, 1, 0),
    j('J32', 'Kalamna Junction',        'Kalamna',                21.2050, 79.1200, 'low',    22, 1, 1),
    j('J33', 'Itwari Junction',         'Itwari',                 21.1560, 79.1000, 'low',    20, 1, 0),
    j('J34', 'Gandhibagh Junction',     'Gandhibagh',             21.1500, 79.1030, 'low',    19, 1, 1),
    j('J35', 'Wadi Junction',           'Wadi',                   21.1900, 79.0150, 'low',    18, 1, 0)
];

  /** Shorthand constructor for a junction record. */
  function j(id, name, district, lat, lng, risk, score, required, deployed) {
    return {
      id: id,
      name: name,
      district: district,
      lat: lat,
      lng: lng,
      risk: risk,                 // 'high' | 'medium' | 'low'
      riskScore: score,           // 0-100
      condition: risk === 'high' ? 'heavy' : (risk === 'medium' ? 'moderate' : 'light'),
      officersRequired: required,
      officersDeployed: deployed,
      units: Math.max(1, Math.round(deployed / 2)),
      unitsRequired: Math.max(1, Math.round(required / 2)),
    };
  }

  const OFFICERS_TOTAL = 105;

  // Deep snapshot of the original data, used by "Reset Demo".
  const JUNCTIONS_INITIAL = JSON.parse(JSON.stringify(JUNCTIONS));

  const JUNCTIONS_BY_ID = {};
  JUNCTIONS.forEach(function (jn) { JUNCTIONS_BY_ID[jn.id] = jn; });

  const INCIDENT_TYPES = [
    { label: 'Traffic Collision',   icon: 'fa-car-burst',           sev: 'red' },
    { label: 'Signal Malfunction',  icon: 'fa-traffic-light',       sev: 'amber' },
    { label: 'Road Obstruction',    icon: 'fa-road-barrier',        sev: 'amber' },
    { label: 'Rule Violation Surge',icon: 'fa-triangle-exclamation', sev: 'amber' },
    { label: 'Pedestrian Incident', icon: 'fa-person-walking-arrow-loop-left', sev: 'red' },
    { label: 'Congestion Cleared',  icon: 'fa-circle-check',        sev: 'green' },
  ];

  const VEHICLE_SPEED_KMH = {
    heavy: 18, moderate: 32, light: 48,
  };

  const VEHICLE_PRIORITY_BONUS = {
    ambulance: 1.15, fire: 1.12, police: 1.0,
  };


  /* ========================================================================
     2. UTILITIES
     ========================================================================
  */

  function $(id) { return document.getElementById(id); }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function riskBadgeClass(risk) { return risk === 'high' ? 'red' : (risk === 'medium' ? 'amber' : 'green'); }
  function riskLabel(risk) { return risk === 'high' ? 'HIGH RISK' : (risk === 'medium' ? 'MEDIUM RISK' : 'LOW RISK'); }
  function conditionLabel(c) { return c === 'heavy' ? 'Heavy Traffic' : (c === 'moderate' ? 'Moderate Traffic' : 'Light Traffic'); }
  function riskColorHex(risk) { return risk === 'high' ? '#ef4444' : (risk === 'medium' ? '#f59e0b' : '#10b981'); }

  function pct(n, total) { return total ? Math.round((n / total) * 1000) / 10 : 0; }

  /** Deterministic PRNG (mulberry32) so per-junction synthetic detail
   *  (incidents, hourly flow) stays stable across re-renders of the same page load. */
  function seededRng(seedStr) {
    let h = 1779033703 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; i++) {
      h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    };
  }

  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /** Small transient toast notification, built inline so no CSS changes are required. */
  let toastTimer = null;
  function toast(message, kind) {
    let el = $('tracs-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'tracs-toast';
      el.style.position = 'fixed';
      el.style.bottom = '24px';
      el.style.right = '24px';
      el.style.zIndex = '4000';
      el.style.padding = '12px 18px';
      el.style.borderRadius = '10px';
      el.style.fontFamily = "'Inter', sans-serif";
      el.style.fontSize = '13px';
      el.style.fontWeight = '600';
      el.style.color = '#fff';
      el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.18)';
      el.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      el.style.maxWidth = '320px';
      document.body.appendChild(el);
    }
    const colors = { info: '#2563eb', success: '#059669', warn: '#f59e0b', danger: '#dc2626' };
    el.style.background = colors[kind] || colors.info;
    el.textContent = message;
    requestAnimationFrame(function () {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
    }, 3200);
  }

  function relativeDaysAgo(n) {
    if (n === 0) return 'Today';
    if (n === 1) return 'Yesterday';
    return n + ' days ago';
  }


  /* ========================================================================
     3. GRAPH + DIJKSTRA (Emergency Dispatch pathfinding)
     ========================================================================
     Builds a k-nearest-neighbour graph over the junctions (a real road
     network isn't available, so proximity stands in for connectivity).
     Edge weight = travel time in minutes, using a per-junction speed
     derived from live traffic condition, so the router naturally prefers
     paths that avoid congested junctions.
  */

  function buildGraph(k) {
    k = k || 4;
    const graph = {};
    JUNCTIONS.forEach(function (a) {
      const dists = JUNCTIONS
        .filter(function (b) { return b.id !== a.id; })
        .map(function (b) { return { id: b.id, km: haversineKm(a.lat, a.lng, b.lat, b.lng) }; })
        .sort(function (x, y) { return x.km - y.km; })
        .slice(0, k);
      graph[a.id] = dists;
    });
    // Ensure symmetry so every edge can be traversed both ways.
    JUNCTIONS.forEach(function (a) {
      graph[a.id].forEach(function (edge) {
        const back = graph[edge.id];
        if (!back.some(function (e) { return e.id === a.id; })) {
          back.push({ id: a.id, km: edge.km });
        }
      });
    });
    return graph;
  }

  function edgeTimeMinutes(fromId, toId, km, speedBonus) {
    const target = JUNCTIONS_BY_ID[toId];
    const speed = VEHICLE_SPEED_KMH[target.condition] * (speedBonus || 1);
    return (km / speed) * 60;
  }

  /** Dijkstra shortest path by travel time. Returns {path:[ids], minutes, km}. */
  function dijkstra(graph, sourceId, targetId, speedBonus) {
    const dist = {}, prev = {}, visited = {};
    Object.keys(graph).forEach(function (id) { dist[id] = Infinity; });
    dist[sourceId] = 0;

    while (true) {
      let u = null, best = Infinity;
      Object.keys(dist).forEach(function (id) {
        if (!visited[id] && dist[id] < best) { best = dist[id]; u = id; }
      });
      if (u === null || u === targetId) break;
      visited[u] = true;

      graph[u].forEach(function (edge) {
        if (visited[edge.id]) return;
        const t = edgeTimeMinutes(u, edge.id, edge.km, speedBonus);
        const alt = dist[u] + t;
        if (alt < dist[edge.id]) {
          dist[edge.id] = alt;
          prev[edge.id] = { id: u, km: edge.km };
        }
      });
    }

    if (dist[targetId] === Infinity) return null;

    const path = [];
    let cur = targetId, totalKm = 0;
    while (cur) {
      path.unshift(cur);
      const p = prev[cur];
      if (!p) break;
      totalKm += p.km;
      cur = p.id;
    }
    return { path: path, minutes: dist[targetId], km: totalKm };
  }


  /* ========================================================================
     4. LEAFLET MAP HELPERS
     ========================================================================
  */

  function nagpurCenter() { return [21.1458, 79.0882]; }

  function baseMap(containerId, opts) {
    if (!$(containerId) || typeof L === 'undefined') return null;
    opts = opts || {};
    const map = L.map(containerId, {
      zoomControl: opts.zoomControl !== false,
      dragging: opts.interactive !== false,
      scrollWheelZoom: opts.interactive !== false,
      doubleClickZoom: opts.interactive !== false,
      touchZoom: opts.interactive !== false,
      attributionControl: false,
    }).setView(opts.center || nagpurCenter(), opts.zoom || 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    return map;
  }

  function addHeatLayer(map, junctions, customOptions) {
    if (!map || typeof L === 'undefined' || !L.heatLayer) return;
    const opts = customOptions || {};
    const points = junctions.map(function (jn) {
      if (opts.customWeight) return [jn.lat, jn.lng, opts.customWeight(jn)];
      const weight = jn.risk === 'high' ? 0.95 : (jn.risk === 'medium' ? 0.6 : 0.25);
      return [jn.lat, jn.lng, weight];
    });
    L.heatLayer(points, {
      radius: opts.radius || 38,
      blur: opts.blur || 26,
      maxZoom: 14,
      minOpacity: opts.minOpacity || 0.35,
      gradient: opts.gradient || { 0.2: '#10b981', 0.5: '#f59e0b', 0.8: '#ef4444' },
    }).addTo(map);
  }

  function addRiskMarkers(map, junctions, onClick) {
    const markers = {};
    junctions.forEach(function (jn) {
      const marker = L.circleMarker([jn.lat, jn.lng], {
        radius: 6,
        color: '#ffffff',
        weight: 2,
        fillColor: riskColorHex(jn.risk),
        fillOpacity: 0.9,
      }).addTo(map);

      marker.bindTooltip(
        '<strong>' + jn.name + '</strong><br/>' + jn.district +
        '<br/>Risk score: ' + jn.riskScore + ' • ' + conditionLabel(jn.condition),
        { direction: 'top', offset: [0, -4] }
      );

      if (onClick) marker.on('click', function () { onClick(jn.id); });
      markers[jn.id] = marker;
    });
    return markers;
  }


  /* ========================================================================
     5. PAGE: OVERVIEW
     ========================================================================
  */

  function initOverview() {
    const high = JUNCTIONS.filter(function (jn) { return jn.risk === 'high'; }).length;
    if ($('hero-stat-high')) $('hero-stat-high').textContent = String(high);

    const heroMap = baseMap('overview-hero-map', { interactive: true, zoomControl: true, zoom: 12 });
    if (heroMap) {
      addHeatLayer(heroMap, JUNCTIONS);
      addRiskMarkers(heroMap, JUNCTIONS);
      setTimeout(function () { heroMap.invalidateSize(); }, 250);
    }

    const teaserMap = baseMap('overview-teaser-map', { interactive: true, zoomControl: true, zoom: 11 });
    if (teaserMap) {
      addHeatLayer(teaserMap, JUNCTIONS);
      addRiskMarkers(teaserMap, JUNCTIONS);
      setTimeout(function () { teaserMap.invalidateSize(); }, 250);
    }
  }


  /* ========================================================================
     6. PAGE: DASHBOARD
     ========================================================================
  */

  const dashboardState = {
    mode: 'cards',
    selectedId: null,
    map: null,
    markers: {},
    charts: {},
  };

  function initDashboard() {
    renderTrafficRows();
    renderOverallDonut();
    renderTop5();

    const defaultId = topRiskJunction().id;
    selectJunction(defaultId);

    setDashboardMode('map');
  }

  function topRiskJunction() {
    return JUNCTIONS.slice().sort(function (a, b) { return b.riskScore - a.riskScore; })[0];
  }

  function trafficCardHTML(jn) {
    const dotColor = jn.risk === 'high' ? '#ef4444' : (jn.risk === 'medium' ? '#f59e0b' : '#10b981');
    return (
      '<div class="traffic-card' + (dashboardState.selectedId === jn.id ? ' selected' : '') + '" data-id="' + jn.id + '">' +
        '<div class="traffic-card-top">' +
          '<div>' +
            '<div class="card-j-name">' + jn.name + '</div>' +
            '<div class="card-j-district">' + jn.district + '</div>' +
          '</div>' +
          '<span class="card-risk-dot" style="display:inline-block;width:12px;height:12px;border-radius:50%;background-color:' + dotColor + ';box-shadow:0 0 8px ' + dotColor + ';" title="' + riskLabel(jn.risk) + '"></span>' +
        '</div>' +
        '<div class="load-bar-container" style="margin-top:12px;">' +
          '<div class="load-bar-header"><span>Risk Score</span><span>' + jn.riskScore + '/100</span></div>' +
          '<div class="load-track"><div class="load-progress ' + riskBadgeClass(jn.risk) + '" style="width:' + jn.riskScore + '%"></div></div>' +
        '</div>' +
        '<div class="load-bar-header" style="margin-top:8px;"><span><i class="fa-solid fa-user-shield"></i> Officers</span><span>' + jn.officersDeployed + ' / ' + jn.officersRequired + '</span></div>' +
      '</div>'
    );
  }

  function renderTrafficRows() {
    const heavy = JUNCTIONS.filter(function (jn) { return jn.risk === 'high'; });
    const moderate = JUNCTIONS.filter(function (jn) { return jn.risk === 'medium'; });
    const light = JUNCTIONS.filter(function (jn) { return jn.risk === 'low'; });

    if ($('dash-heavy-cards')) $('dash-heavy-cards').innerHTML = heavy.map(trafficCardHTML).join('');
    if ($('dash-mod-cards')) $('dash-mod-cards').innerHTML = moderate.map(trafficCardHTML).join('');
    if ($('dash-light-cards')) $('dash-light-cards').innerHTML = light.map(trafficCardHTML).join('');

    if ($('dash-count-heavy')) $('dash-count-heavy').textContent = heavy.length + ' Locations';
    if ($('dash-mod-cards-count')) $('dash-mod-cards-count').textContent = moderate.length + ' Locations';
    if ($('dash-light-cards-count')) $('dash-light-cards-count').textContent = light.length + ' Locations';

    qsa('.traffic-card').forEach(function (card) {
      card.addEventListener('click', function () { selectJunction(card.getAttribute('data-id')); });
    });
  }

  function renderOverallDonut() {
    if (!$('chart-overall-risk') || typeof Chart === 'undefined') return;
    const high = JUNCTIONS.filter(function (jn) { return jn.risk === 'high'; }).length;
    const med = JUNCTIONS.filter(function (jn) { return jn.risk === 'medium'; }).length;
    const low = JUNCTIONS.filter(function (jn) { return jn.risk === 'low'; }).length;
    const total = JUNCTIONS.length;

    if ($('stat-total-junctions')) $('stat-total-junctions').textContent = String(total);
    if ($('legend-count-high')) $('legend-count-high').textContent = high + ' (' + pct(high, total) + '%)';
    if ($('legend-count-medium')) $('legend-count-medium').textContent = med + ' (' + pct(med, total) + '%)';
    if ($('legend-count-low')) $('legend-count-low').textContent = low + ' (' + pct(low, total) + '%)';

    if (dashboardState.charts.overall) dashboardState.charts.overall.destroy();
    dashboardState.charts.overall = new Chart($('chart-overall-risk').getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['High Risk', 'Medium Risk', 'Low Risk'],
        datasets: [{ data: [high, med, low], backgroundColor: ['#ef4444', '#f59e0b', '#10b981'], borderWidth: 0 }],
      },
      options: {
        cutout: '72%',
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
      },
    });
  }

  function renderTop5() {
    if (!$('top-5-ranked-container')) return;
    const top5 = JUNCTIONS.slice().sort(function (a, b) { return b.riskScore - a.riskScore; }).slice(0, 5);
    $('top-5-ranked-container').innerHTML = top5.map(function (jn, i) {
      return (
        '<div class="ranked-item-row">' +
          '<div class="ranked-header">' +
            '<span>' + (i + 1) + '. ' + jn.name + '</span>' +
            '<strong class="text-' + (jn.risk === 'high' ? 'red' : jn.risk === 'medium' ? 'amber' : 'green') + '">' + jn.riskScore + '</strong>' +
          '</div>' +
          '<div class="load-track"><div class="load-progress ' + riskBadgeClass(jn.risk) + '" style="width:' + jn.riskScore + '%"></div></div>' +
        '</div>'
      );
    }).join('');
  }

  function selectJunction(id) {
    dashboardState.selectedId = id;
    const jn = JUNCTIONS_BY_ID[id];
    if (!jn) return;

    qsa('.traffic-card').forEach(function (card) {
      card.classList.toggle('selected', card.getAttribute('data-id') === id);
    });

    if ($('panel-j-name')) $('panel-j-name').textContent = jn.name;
    if ($('panel-j-badge')) {
      $('panel-j-badge').textContent = riskLabel(jn.risk);
      $('panel-j-badge').className = 'badge-danger';
    }
    if ($('panel-j-district')) $('panel-j-district').textContent = jn.district + ' • Junction ID: JN-1' + jn.id.slice(1);
    if ($('panel-officers')) $('panel-officers').textContent = String(jn.officersDeployed);
    if ($('panel-units')) $('panel-units').textContent = String(jn.units);

    const donutPct = Math.round((jn.officersDeployed / jn.officersRequired) * 100);
    if ($('panel-donut-pct')) $('panel-donut-pct').innerHTML = donutPct + '%<br/><small>Deployment</small>';

    renderTelemetryDonut(jn);
    renderTelemetryFlow(jn);
    renderIncidentList(jn);

    if (dashboardState.map && dashboardState.markers[id]) {
      dashboardState.map.panTo([jn.lat, jn.lng]);
    }
  }

  function renderTelemetryDonut(jn) {
    if (!$('chart-telemetry-donut') || typeof Chart === 'undefined') return;
    const deployed = Math.min(jn.officersDeployed, jn.officersRequired);
    const remaining = Math.max(0, jn.officersRequired - jn.officersDeployed);
    if (dashboardState.charts.telemetryDonut) dashboardState.charts.telemetryDonut.destroy();
    dashboardState.charts.telemetryDonut = new Chart($('chart-telemetry-donut').getContext('2d'), {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [deployed, remaining],
          backgroundColor: ['#2563eb', '#e2e8f0'],
          borderWidth: 0,
        }],
      },
      options: { cutout: '72%', plugins: { legend: { display: false }, tooltip: { enabled: false } } },
    });
  }

  function hourlyFlowFor(jn) {
    const rng = seededRng(jn.id + '-flow');
    const base = jn.riskScore;
    const hours = [];
    for (let h = 0; h < 24; h++) {
      const rush = (h >= 8 && h <= 10) || (h >= 17 && h <= 20) ? 1.4 : 1.0;
      const noise = 0.85 + rng() * 0.3;
      hours.push(Math.round(base * rush * noise));
    }
    return hours;
  }

  function renderTelemetryFlow(jn) {
    if (!$('chart-telemetry-flow') || typeof Chart === 'undefined') return;
    const data = hourlyFlowFor(jn);
    const labels = data.map(function (_, h) { return h + ':00'; });
    if (dashboardState.charts.flow) dashboardState.charts.flow.destroy();
    dashboardState.charts.flow = new Chart($('chart-telemetry-flow').getContext('2d'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37,99,235,0.08)',
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2,
        }],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { maxTicksLimit: 6, font: { size: 9 } }, grid: { display: false } },
          y: { display: false },
        },
      },
    });
  }

  function renderIncidentList(jn) {
    if (!$('panel-incident-list')) return;
    const rng = seededRng(jn.id + '-incidents');
    const count = jn.risk === 'high' ? 3 : (jn.risk === 'medium' ? 2 : 1);
    const rows = [];
    for (let i = 0; i < count; i++) {
      const type = INCIDENT_TYPES[Math.floor(rng() * INCIDENT_TYPES.length)];
      const daysAgo = Math.floor(rng() * 7);
      rows.push(
        '<div class="incident-row">' +
          '<i class="fa-solid ' + type.icon + ' icon-' + type.sev + '"></i>' +
          '<div class="inc-desc"><strong>' + type.label + '</strong><span>' + relativeDaysAgo(daysAgo) + '</span></div>' +
          '<span class="tag-pill ' + type.sev + '">' + (type.sev === 'red' ? 'High' : type.sev === 'amber' ? 'Medium' : 'Low') + '</span>' +
        '</div>'
      );
    }
    if (rows.length === 0) rows.push('<div class="inc-desc"><span>No incidents in the last 7 days.</span></div>');
    $('panel-incident-list').innerHTML = rows.join('');
  }

  function ensureDashboardMap() {
    if (dashboardState.map || !$('dashboard-interactive-map')) return;
    dashboardState.map = baseMap('dashboard-interactive-map', { zoom: 12 });
    if (dashboardState.map) {
      addHeatLayer(dashboardState.map, JUNCTIONS);
      dashboardState.markers = addRiskMarkers(dashboardState.map, JUNCTIONS, selectJunction);
      setTimeout(function () { if (dashboardState.map) dashboardState.map.invalidateSize(); }, 200);
    }
  }

  // ---- global handlers referenced by inline onclick= in the HTML ----

  window.setDashboardMode = function (mode) {
    dashboardState.mode = mode;
    const cardsWrap = $('dashboard-cards-main-wrap');
    const mapWrap = $('dashboard-fullscreen-map-wrap');
    const btnCards = $('btn-mode-cards');
    const btnMap = $('btn-mode-map');

    if (mode === 'map') {
      if (cardsWrap) cardsWrap.classList.remove('hidden');
      if (mapWrap) mapWrap.classList.remove('hidden');
      if (btnCards) btnCards.classList.remove('active');
      if (btnMap) btnMap.classList.add('active');
      ensureDashboardMap();
      setTimeout(function () { if (dashboardState.map) dashboardState.map.invalidateSize(); }, 50);
    } else {
      if (cardsWrap) cardsWrap.classList.remove('hidden');
      if (btnCards) btnCards.classList.add('active');
      if (btnMap) btnMap.classList.remove('active');
      if (cardsWrap) {
        cardsWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  window.refreshDashboardData = function () {
    const now = new Date();
    const label = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const el = qs('.last-updated-text span');
    if (el) el.textContent = 'Last updated: ' + label;

    // Small organic jitter on risk scores to feel "live", clamped to sane bounds.
    JUNCTIONS.forEach(function (jn) {
      const drift = Math.round((Math.random() - 0.5) * 4);
      jn.riskScore = Math.max(5, Math.min(99, jn.riskScore + drift));
      jn.risk = jn.riskScore >= 70 ? 'high' : (jn.riskScore >= 40 ? 'medium' : 'low');
      jn.condition = jn.risk === 'high' ? 'heavy' : (jn.risk === 'medium' ? 'moderate' : 'light');
    });

    renderTrafficRows();
    renderOverallDonut();
    renderTop5();
    if (JUNCTIONS_BY_ID[dashboardState.selectedId]) selectJunction(dashboardState.selectedId);
    toast('Traffic data refreshed', 'success');
  };

  window.simulateAccidentAtSelected = function () {
    ensureDashboardMap();
    const id = dashboardState.selectedId || topRiskJunction().id;
    const jn = JUNCTIONS_BY_ID[id];
    if (!jn) return;

    jn.riskScore = 96;
    jn.risk = 'high';
    jn.condition = 'heavy';
    jn.has_active_incident = true;
    jn.officersRequired = Math.max(jn.officersRequired, jn.officersDeployed + 3);

    renderTrafficRows();
    renderOverallDonut();
    renderTop5();
    selectJunction(id);

    if (dashboardState.map && dashboardState.markers[id]) {
      dashboardState.markers[id].setStyle({ fillColor: '#ef4444', radius: 7 });
    }

    if ($('panel-incident-list')) {
      const alertRow =
        '<div class="incident-row">' +
          '<i class="fa-solid fa-car-burst icon-red"></i>' +
          '<div class="inc-desc"><strong>Traffic Collision (Simulated)</strong><span>Just now</span></div>' +
          '<span class="tag-pill red">High</span>' +
        '</div>';
      $('panel-incident-list').insertAdjacentHTML('afterbegin', alertRow);
    }

    toast('Accident simulated at ' + jn.name + ' — risk elevated to 96 (High Risk)', 'danger');
  };

  window.runGreedyOptimizer = function () {
    // Greedy redistribution: pull officers from lower-risk junctions to high-risk & incident locations
    let moved = 0;

    const targets = JUNCTIONS
      .filter(function (jn) { return jn.riskScore >= 60 || jn.officersDeployed < jn.officersRequired; })
      .sort(function (a, b) { return b.riskScore - a.riskScore; });

    const donors = JUNCTIONS
      .filter(function (jn) { return jn.riskScore < 50 && jn.officersDeployed > 1; })
      .sort(function (a, b) { return a.riskScore - b.riskScore; });

    let d = 0;
    targets.forEach(function (target) {
      let needed = Math.max(1, target.officersRequired - target.officersDeployed);
      while (needed > 0 && d < donors.length) {
        const donor = donors[d];
        if (donor.id === target.id || donor.officersDeployed <= 1) { d++; continue; }

        donor.officersDeployed -= 1;
        target.officersDeployed += 1;
        target.riskScore = Math.max(15, target.riskScore - 14);
        target.risk = target.riskScore >= 70 ? 'high' : (target.riskScore >= 40 ? 'medium' : 'low');
        target.condition = target.risk === 'high' ? 'heavy' : (target.risk === 'medium' ? 'moderate' : 'light');

        moved += 1;
        needed -= 1;

        if (donor.officersDeployed <= 1) d++;
      }
    });

    renderTrafficRows();
    renderOverallDonut();
    renderTop5();
    if (JUNCTIONS_BY_ID[dashboardState.selectedId]) selectJunction(dashboardState.selectedId);
    renderDeploymentSection();

    if (dashboardState.map) {
      JUNCTIONS.forEach(function (jn) {
        if (dashboardState.markers[jn.id]) {
          dashboardState.markers[jn.id].setStyle({
            fillColor: riskColorHex(jn.risk),
            radius: 6
          });
        }
      });
    }

    toast(moved > 0
      ? 'AI Optimization complete — ' + moved + ' officer' + (moved === 1 ? '' : 's') + ' redeployed to high-risk junctions'
      : 'Deployment optimal — police coverage balanced across city', 'success');
  };

  window.resetDemoState = function () {
    const fresh = JSON.parse(JSON.stringify(JUNCTIONS_INITIAL));
    JUNCTIONS.forEach(function (jn, i) {
      Object.assign(jn, fresh[i]);
    });
    renderTrafficRows();
    renderOverallDonut();
    renderTop5();
    selectJunction(topRiskJunction().id);
    renderDeploymentSection();
    toast('Demo state reset', 'info');
  };


  /* ========================================================================
     7. PAGE: DEPLOYMENT
     ========================================================================
  */

  const deploymentState = {
    showAll: false,
    showAllActivity: false,
    log: [
      { time: '10:15 AM', activity: 'Officer deployed', status: 'Dispatched', statusColor: 'green', officerId: 'OF-1042', by: 'AI Dispatch', location: 'MG Road Junction' },
      { time: '10:02 AM', activity: 'Patrol shift reassigned', status: 'Active', statusColor: 'blue', officerId: 'OF-2089', by: 'Control Room', location: 'Central Square' },
      { time: '09:45 AM', activity: 'Emergency unit dispatched', status: 'En Route', statusColor: 'amber', officerId: 'OF-3105', by: 'Emergency Bot', location: 'Medical Square' },
      { time: '09:12 AM', activity: 'Traffic control deployed', status: 'Completed', statusColor: 'green', officerId: 'OF-1150', by: 'AI Dispatch', location: 'Sitabuldi Junction' }
    ]
  };

  function initDeployment() {
    renderDeploymentSection();
  }

  function renderDeploymentSection() {
    if (!$('dep-stat-total') && !$('dep-needing-officers-grid')) return;

    const deployed = JUNCTIONS.reduce(function (s, jn) { return s + jn.officersDeployed; }, 0);
    const available = Math.max(0, OFFICERS_TOTAL - deployed);
    const highPriorityAvailable = Math.max(0, Math.round(available * 0.35));

    if ($('dep-stat-total')) $('dep-stat-total').textContent = String(OFFICERS_TOTAL);
    if ($('dep-stat-deployed')) $('dep-stat-deployed').textContent = String(deployed);
    if ($('dep-stat-deployed-pct')) $('dep-stat-deployed-pct').textContent = pct(deployed, OFFICERS_TOTAL) + '% of total';
    if ($('dep-stat-avail')) $('dep-stat-avail').textContent = String(available);
    if ($('dep-stat-avail-pct')) $('dep-stat-avail-pct').textContent = pct(available, OFFICERS_TOTAL) + '% of total';
    if ($('dep-stat-high-priority')) $('dep-stat-high-priority').textContent = String(highPriorityAvailable);

    const needing = JUNCTIONS.filter(function (jn) { return jn.officersDeployed < jn.officersRequired; });
    const sufficient = JUNCTIONS.length - needing.length;
    const additionalNeeded = needing.reduce(function (s, jn) { return s + (jn.officersRequired - jn.officersDeployed); }, 0);

    if ($('dep-sum-needing')) $('dep-sum-needing').textContent = String(needing.length);
    if ($('dep-sum-sufficient')) $('dep-sum-sufficient').textContent = String(sufficient);
    if ($('dep-sum-additional')) $('dep-sum-additional').textContent = String(additionalNeeded);

    const high = JUNCTIONS.filter(function (jn) { return jn.risk === 'high'; }).length;
    const med = JUNCTIONS.filter(function (jn) { return jn.risk === 'medium'; }).length;
    const low = JUNCTIONS.filter(function (jn) { return jn.risk === 'low'; }).length;
    if ($('qs-high')) $('qs-high').textContent = String(high);
    if ($('qs-med')) $('qs-med').textContent = String(med);
    if ($('qs-low')) $('qs-low').textContent = String(low);

    if ($('dep-needing-officers-grid')) {
      const list = needing.length > 0 ? needing : JUNCTIONS.filter(function (jn) { return jn.risk === 'high' || jn.risk === 'medium'; });
      const sorted = list.slice().sort(function (a, b) { return b.riskScore - a.riskScore; });
      const displayList = deploymentState.showAll ? sorted : sorted.slice(0, 6);

      $('dep-needing-officers-grid').innerHTML = displayList.map(function (jn) {
        const deficit = Math.max(0, jn.officersRequired - jn.officersDeployed);
        return (
          '<div class="officer-need-card' + (jn.risk === 'high' ? ' high-priority' : '') + '">' +
            '<div class="need-head">' +
              '<div>' +
                '<div class="need-name">' + jn.name + '</div>' +
                '<div class="need-sub">' + jn.district + ' • JN-1' + jn.id.slice(1) + '</div>' +
              '</div>' +
              '<span class="badge-risk ' + (jn.risk === 'medium' ? 'med' : jn.risk) + '">' + riskLabel(jn.risk) + '</span>' +
            '</div>' +
            '<div class="need-stats-box">' +
              '<div><span>Deployed</span><strong>' + jn.officersDeployed + '</strong></div>' +
              '<div><span>Required</span><strong>' + jn.officersRequired + '</strong></div>' +
              '<div><span>Deficit</span><strong class="text-red">' + deficit + '</strong></div>' +
            '</div>' +
            '<button class="btn btn-outline btn-block btn-sm" onclick="deployOneOfficer(\'' + jn.id + '\')">' +
              '<i class="fa-solid fa-user-plus"></i> Deploy 1 Officer' +
            '</button>' +
          '</div>'
        );
      }).join('');

      const loadMoreBtn = qs('.load-more-link');
      if (loadMoreBtn) {
        const remaining = sorted.length - displayList.length;
        loadMoreBtn.innerHTML = deploymentState.showAll
          ? 'Showing All ' + sorted.length + ' Junctions <i class="fa-solid fa-chevron-up"></i>'
          : 'Load More Junctions (' + (remaining > 0 ? remaining : JUNCTIONS.length - 6) + ' Remaining) <i class="fa-solid fa-chevron-down"></i>';
        loadMoreBtn.setAttribute('onclick', 'toggleLoadMoreJunctions()');
      }
    }

    renderActivityTable();
  }

  function renderActivityTable() {
    if (!$('dep-activity-tbody')) return;
    const limit = deploymentState.showAllActivity ? 20 : 5;
    const activityLog = deploymentState.log.slice(0, limit);
    if (activityLog.length === 0) {
      $('dep-activity-tbody').innerHTML =
        '<tr><td colspan="6" style="text-align:center;color:var(--text-dim)">No recent activity yet.</td></tr>';
      return;
    }
    $('dep-activity-tbody').innerHTML = activityLog.map(function (entry) {
      return (
        '<tr>' +
          '<td>' + entry.time + '</td>' +
          '<td>' + entry.activity + '</td>' +
          '<td><span class="tag-badge ' + entry.statusColor + '">' + entry.status + '</span></td>' +
          '<td>' + entry.officerId + '</td>' +
          '<td>' + entry.by + '</td>' +
          '<td>' + entry.location + '</td>' +
        '</tr>'
      );
    }).join('');

    const link = qs('.table-footer-link a');
    if (link) {
      link.innerHTML = deploymentState.showAllActivity
        ? 'Show Less <i class="fa-solid fa-chevron-up"></i>'
        : 'View All Activity (' + deploymentState.log.length + ' Total) <i class="fa-solid fa-chevron-right"></i>';
      link.setAttribute('onclick', 'toggleViewAllActivity()');
    }
  }

  function logActivity(activity, status, statusColor, location) {
    const now = new Date();
    deploymentState.log.unshift({
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      activity: activity,
      status: status,
      statusColor: statusColor,
      officerId: 'OF-' + (1000 + Math.floor(Math.random() * 8999)),
      by: 'AI Dispatch',
      location: location,
    });
    deploymentState.log = deploymentState.log.slice(0, 20);
  }

  window.toggleLoadMoreJunctions = function () {
    deploymentState.showAll = !deploymentState.showAll;
    renderDeploymentSection();
  };

  window.toggleViewAllActivity = function () {
    deploymentState.showAllActivity = !deploymentState.showAllActivity;
    renderActivityTable();
  };

  window.deployOneOfficer = function (junctionId) {
    const jn = JUNCTIONS_BY_ID[junctionId];
    if (!jn) return;
    jn.officersDeployed += 1;
    logActivity('Officer deployed', 'Dispatched', 'green', jn.name);
    renderDeploymentSection();
    renderTrafficRows();
    renderTop5();
    toast('1 officer deployed to ' + jn.name, 'success');
  };


  /* ========================================================================
     8. PAGE: DISPATCH (Emergency Vehicle Routing)
     ========================================================================
  */

  const dispatchState = {
    map: null,
    graph: null,
    vehicle: 'ambulance',
    routeLayer: null,
    standardLayer: null,
    markersLayer: null,
  };

  function initDispatch() {
    dispatchState.graph = buildGraph(4);

    populateDispatchDropdowns();
    wireVehicleButtons();

    dispatchState.map = baseMap('dispatch-leaflet-map', { zoom: 12 });
    if (dispatchState.map) {
      addHeatLayer(dispatchState.map, JUNCTIONS);
      dispatchState.markersLayer = L.layerGroup().addTo(dispatchState.map);
      JUNCTIONS.forEach(function (jn) {
        L.circleMarker([jn.lat, jn.lng], {
          radius: 6,
          color: '#ffffff',
          weight: 2,
          fillColor: riskColorHex(jn.risk),
          fillOpacity: 0.9,
        }).bindTooltip(jn.name, { direction: 'top' }).addTo(dispatchState.markersLayer);
      });
    }
  }

  function populateDispatchDropdowns() {
    const src = $('dispatch-src-dropdown');
    const tgt = $('dispatch-tgt-dropdown');
    if (!src || !tgt) return;

    const options = JUNCTIONS
      .slice()
      .sort(function (a, b) { return a.name.localeCompare(b.name); })
      .map(function (jn) { return '<option value="' + jn.id + '">' + jn.name + ' — ' + jn.district + '</option>'; })
      .join('');

    src.innerHTML = '<option value="">Select Origin Junction...</option>' + options;
    tgt.innerHTML = '<option value="">Select Target Junction...</option>' + options;

    // Sensible demo defaults: a hospital-area origin to the current highest-risk junction.
    const originGuess = JUNCTIONS.find(function (jn) { return jn.name.indexOf('Hospital') !== -1; }) || JUNCTIONS[0];
    const targetGuess = topRiskJunction();
    src.value = originGuess.id;
    tgt.value = targetGuess.id;
  }

  function wireVehicleButtons() {
    qsa('.btn-vehicle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        qsa('.btn-vehicle').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        dispatchState.vehicle = btn.getAttribute('data-type') || 'ambulance';
      });
    });
  }

  window.calculateEmergencyRoute = function () {
    const src = $('dispatch-src-dropdown');
    const tgt = $('dispatch-tgt-dropdown');
    if (!src || !tgt || !src.value || !tgt.value) {
      toast('Select both an origin and a destination junction', 'warn');
      return;
    }
    if (src.value === tgt.value) {
      toast('Origin and destination must be different junctions', 'warn');
      return;
    }

    const bonus = VEHICLE_PRIORITY_BONUS[dispatchState.vehicle] || 1.0;

    // "TRACS AI route": Dijkstra minimizing live travel time (bypasses congestion).
    const aiRoute = dijkstra(dispatchState.graph, src.value, tgt.value, bonus);
    // "Standard GPS route": shortest physical distance, ignoring live congestion,
    // timed at the same (lower) priority-free speeds — usually slower in practice.
    const gpsRoute = dijkstraByDistance(dispatchState.graph, src.value, tgt.value, bonus);

    if (!aiRoute || !gpsRoute) {
      toast('No route could be calculated between those junctions', 'danger');
      return;
    }

    const savedPct = Math.max(0, Math.round((1 - aiRoute.minutes / gpsRoute.minutes) * 1000) / 10);
    const bypassed = gpsRoute.path.filter(function (id) { return aiRoute.path.indexOf(id) === -1; }).length;

    if ($('disp-old-time')) $('disp-old-time').textContent = gpsRoute.minutes.toFixed(1) + ' min';
    if ($('disp-new-time')) $('disp-new-time').textContent = aiRoute.minutes.toFixed(1) + ' min';
    if ($('disp-saved-pct')) $('disp-saved-pct').textContent = savedPct + '% Faster';
    if ($('disp-dist')) $('disp-dist').textContent = aiRoute.km.toFixed(1) + ' km';
    if ($('disp-waypoints')) $('disp-waypoints').textContent = (aiRoute.path.length - 2 >= 0 ? aiRoute.path.length - 2 : 0) + ' Junctions';

    drawDispatchRoute(aiRoute, gpsRoute);
    toast('Route calculated — TRACS AI route is ' + savedPct + '% faster, bypassing ' + bypassed + ' congested junction' + (bypassed === 1 ? '' : 's'), 'success');
  };

  /** Same Dijkstra machinery, but weighted by raw distance (km) instead of live time,
   *  approximating what a generic GPS app would route without traffic-awareness. */
  function dijkstraByDistance(graph, sourceId, targetId, bonus) {
    const dist = {}, prev = {}, visited = {};
    Object.keys(graph).forEach(function (id) { dist[id] = Infinity; });
    dist[sourceId] = 0;

    while (true) {
      let u = null, best = Infinity;
      Object.keys(dist).forEach(function (id) {
        if (!visited[id] && dist[id] < best) { best = dist[id]; u = id; }
      });
      if (u === null || u === targetId) break;
      visited[u] = true;

      graph[u].forEach(function (edge) {
        if (visited[edge.id]) return;
        const alt = dist[u] + edge.km;
        if (alt < dist[edge.id]) {
          dist[edge.id] = alt;
          prev[edge.id] = { id: u, km: edge.km };
        }
      });
    }

    if (dist[targetId] === Infinity) return null;

    const path = [];
    let cur = targetId, totalKm = 0, totalMinutes = 0;
    while (cur) {
      path.unshift(cur);
      const p = prev[cur];
      if (!p) break;
      totalKm += p.km;
      // Time these distance-only edges at real (unbypassed) traffic speed, no priority bonus,
      // since a standard GPS route does not get a live-congestion or priority-lane advantage.
      totalMinutes += edgeTimeMinutes(p.id, cur, p.km, 1.0);
      cur = p.id;
    }
    return { path: path, minutes: totalMinutes, km: totalKm };
  }

  function fetchOSRMPath(pathNodeIds, callback) {
    if (!pathNodeIds || pathNodeIds.length < 2) return;
    const waypoints = pathNodeIds.map(function (id) {
      const jn = JUNCTIONS_BY_ID[id];
      return jn ? jn.lng + ',' + jn.lat : null;
    }).filter(Boolean).join(';');

    const url = 'https://router.project-osrm.org/route/v1/driving/' + waypoints + '?overview=full&geometries=geojson';

    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.routes && data.routes[0] && data.routes[0].geometry) {
          const coords = data.routes[0].geometry.coordinates;
          const latLngs = coords.map(function (c) { return [c[1], c[0]]; });
          callback(latLngs);
        } else {
          fallbackRoadPath(pathNodeIds, callback);
        }
      })
      .catch(function () {
        fallbackRoadPath(pathNodeIds, callback);
      });
  }

  function fallbackRoadPath(pathNodeIds, callback) {
    const latLngs = [];
    for (let i = 0; i < pathNodeIds.length; i++) {
      const curr = JUNCTIONS_BY_ID[pathNodeIds[i]];
      if (!curr) continue;
      latLngs.push([curr.lat, curr.lng]);
      if (i < pathNodeIds.length - 1) {
        const next = JUNCTIONS_BY_ID[pathNodeIds[i + 1]];
        if (next) {
          latLngs.push([curr.lat, next.lng]);
        }
      }
    }
    callback(latLngs);
  }

  function drawDispatchRoute(aiRoute, gpsRoute) {
    if (!dispatchState.map) return;

    if (dispatchState.routeLayer) dispatchState.map.removeLayer(dispatchState.routeLayer);
    if (dispatchState.standardLayer) dispatchState.map.removeLayer(dispatchState.standardLayer);

    fetchOSRMPath(gpsRoute.path, function (gpsLatLngs) {
      if (dispatchState.map) {
        dispatchState.standardLayer = L.polyline(gpsLatLngs, {
          color: '#ef4444', weight: 4, dashArray: '8 8', opacity: 0.85,
        }).addTo(dispatchState.map);
      }
    });

    fetchOSRMPath(aiRoute.path, function (aiLatLngs) {
      if (dispatchState.map) {
        dispatchState.routeLayer = L.polyline(aiLatLngs, {
          color: '#06b6d4', weight: 6, opacity: 0.95,
        }).addTo(dispatchState.map);

        dispatchState.map.fitBounds(dispatchState.routeLayer.getBounds(), { padding: [40, 40] });
      }
    });
  }


  /* ========================================================================
     9. PAGE: ANALYTICS
     ========================================================================
  */

  const analyticsState = {
    showAllJunctions: false,
    dateRange: 'may2025'
  };

  function initAnalytics() {
    renderAnalyticsBarChart();
    renderAnalyticsSparkline();
    renderAnalyticsComparisonTable();

    const beforeJunctions = JUNCTIONS_INITIAL.map(function (jn) {
      const riskScore = Math.min(100, jn.riskScore + 25);
      return Object.assign({}, jn, { riskScore: riskScore, risk: riskScore >= 70 ? 'high' : (riskScore >= 40 ? 'medium' : 'low') });
    });

    const afterJunctions = JUNCTIONS.map(function (jn) {
      const riskScore = Math.max(15, jn.riskScore - 20);
      return Object.assign({}, jn, { riskScore: riskScore, risk: riskScore >= 70 ? 'high' : (riskScore >= 40 ? 'medium' : 'low') });
    });

    const beforeMap = baseMap('analytics-map-before', { interactive: true, zoom: 12 });
    if (beforeMap) {
      addHeatLayer(beforeMap, beforeJunctions, {
        radius: 38,
        blur: 24,
        minOpacity: 0.38,
        gradient: { 0.15: '#fb923c', 0.5: '#f97316', 0.8: '#ef4444' },
        customWeight: function (jn) { return jn.risk === 'high' ? 0.95 : (jn.risk === 'medium' ? 0.65 : 0.4); }
      });
      addRiskMarkers(beforeMap, beforeJunctions);
      setTimeout(function () { if (beforeMap) beforeMap.invalidateSize(); }, 200);
    }

    const afterMap = baseMap('analytics-map-after', { interactive: true, zoom: 12 });
    if (afterMap) {
      addHeatLayer(afterMap, afterJunctions, {
        radius: 34,
        blur: 22,
        minOpacity: 0.32,
        gradient: { 0.2: '#10b981', 0.55: '#84cc16', 0.85: '#f59e0b' },
        customWeight: function (jn) { return jn.risk === 'high' ? 0.6 : (jn.risk === 'medium' ? 0.35 : 0.18); }
      });
      addRiskMarkers(afterMap, afterJunctions);
      setTimeout(function () { if (afterMap) afterMap.invalidateSize(); }, 200);
    }
  }

  function renderAnalyticsComparisonTable() {
    if (!$('analytics-comparison-tbody')) return;
    const sorted = JUNCTIONS.slice().sort(function (a, b) { return b.riskScore - a.riskScore; });
    const list = analyticsState.showAllJunctions ? sorted : sorted.slice(0, 6);

    $('analytics-comparison-tbody').innerHTML = list.map(function (jn, i) {
      const beforeRisk = Math.min(98, jn.riskScore + 28);
      const afterRisk = Math.max(15, jn.riskScore - 12);
      const beforeBadge = beforeRisk >= 70 ? 'red' : (beforeRisk >= 40 ? 'amber' : 'green');
      const afterBadge = afterRisk >= 70 ? 'red' : (afterRisk >= 40 ? 'amber' : 'green');

      return (
        '<tr>' +
          '<td><strong>' + (i + 1) + '. ' + jn.name + '</strong></td>' +
          '<td><span class="tag-badge ' + beforeBadge + '">' + (beforeBadge === 'red' ? 'Critical' : beforeBadge === 'amber' ? 'High' : 'Moderate') + ' • ' + beforeRisk + '</span></td>' +
          '<td><span class="tag-badge ' + afterBadge + '">' + (afterBadge === 'red' ? 'Critical' : afterBadge === 'amber' ? 'Moderate' : 'Low') + ' • ' + afterRisk + '</span></td>' +
        '</tr>'
      );
    }).join('');

    const link = qs('.table-bottom-link a');
    if (link) {
      link.innerHTML = analyticsState.showAllJunctions
        ? 'Show fewer junctions <i class="fa-solid fa-chevron-up"></i>'
        : 'View all ' + JUNCTIONS.length + ' junctions →';
      link.setAttribute('onclick', 'toggleViewAllAnalyticsJunctions()');
    }
  }

  window.toggleViewAllAnalyticsJunctions = function () {
    analyticsState.showAllJunctions = !analyticsState.showAllJunctions;
    renderAnalyticsComparisonTable();
  };

  window.changeAnalyticsDateRange = function (rangeVal) {
    analyticsState.dateRange = rangeVal;
    toast('Analytics period updated to ' + (rangeVal === 'may2025' ? 'May 2025' : rangeVal === 'apr2025' ? 'April 2025' : rangeVal === 'mar2025' ? 'March 2025' : 'Q1 2025'), 'info');
    renderAnalyticsBarChart();
    renderAnalyticsSparkline();
  };

  function renderAnalyticsBarChart() {
    if (!$('chart-analytics-grouped-bar') || typeof Chart === 'undefined') return;
    // Mirrors the "Junction Condition Comparison" table on this page.
    const labels = ['MG Road', 'Central Sq.', 'Airport', 'Tech Park', 'City Hospital', 'University'];
    const before = [85, 80, 72, 66, 65, 58];
    const after = [42, 38, 36, 28, 30, 26];

    new Chart($('chart-analytics-grouped-bar').getContext('2d'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'Before Deployment', data: before, backgroundColor: '#93c5fd', borderRadius: 4 },
          { label: 'After Deployment', data: after, backgroundColor: '#10b981', borderRadius: 4 },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: { beginAtZero: true, max: 100, ticks: { font: { size: 10 } } },
        },
      },
    });
  }

  function renderAnalyticsSparkline() {
    if (!$('chart-avg-risk-line') || typeof Chart === 'undefined') return;
    const data = [68, 61, 54, 47, 40, 35];
    new Chart($('chart-avg-risk-line').getContext('2d'), {
      type: 'line',
      data: {
        labels: data.map(function (_, i) { return 'Wk ' + i; }),
        datasets: [{
          data: data, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)',
          fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2,
        }],
      },
      options: {
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
      },
    });
  }


  /* ========================================================================
     10. BOOT
     ========================================================================
  */

  document.addEventListener('DOMContentLoaded', function () {
    // Collapsible telemetry drawer (Dashboard page).
    const collapseBtn = qs('.collapse-btn');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', function () {
        const grid = qs('.panel-content-grid');
        if (!grid) return;
        const isHidden = grid.style.display === 'none';
        grid.style.display = isHidden ? '' : 'none';
        collapseBtn.innerHTML = isHidden
          ? 'Collapse <i class="fa-solid fa-chevron-up"></i>'
          : 'Expand <i class="fa-solid fa-chevron-down"></i>';
      });
    }

    if ($('page-overview')) initOverview();
    if ($('page-dashboard')) initDashboard();
    if ($('page-deployment')) initDeployment();
    if ($('page-dispatch')) initDispatch();
    if ($('page-analytics')) initAnalytics();
  });

  // Exposed for the "Explore the System" scroll button on the Overview page.
  window.scrollToSection = function (id) {
    const el = $(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

})();