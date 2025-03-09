let map; // Declare the map variable

// Create the Leaflet map
function createMap() {
    map = L.map('map', {
        center: [44, -120.5], // Center on Oregon
        zoom: 7 // State level zoom
    });

    // Add base tile layer from Stadia maps
    L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key=4c175b69-da77-4ffe-b10b-9edb2c25a733', {
        attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        minZoom: 5,
        maxZoom: 12
    }).addTo(map);
}

// Classify counties by the number of schools using Turf.js
function symbolizeCountiesByschool(countyData, schoolData) {
    if (!countyData || !schoolData) return;

    countyData.features.forEach(county => {
        const validSchools = {
            type: 'FeatureCollection',
            features: schoolData.features.filter(school => school.geometry?.type === 'Point')
        };

        const schoolsInCounty = turf.pointsWithinPolygon(validSchools, county);
        county.properties.schoolCount = schoolsInCounty.features.length;
    });

    const breaks = [15, 30, 60, 80, 100];
    const colorScale = ['#feedde', '#fdbe85', '#fd8d3c', '#e6550d', '#a63603'];

    function getColor(count) {
        if (count <= breaks[0]) return colorScale[0];
        if (count <= breaks[1]) return colorScale[1];
        if (count <= breaks[2]) return colorScale[2];
        if (count <= breaks[3]) return colorScale[3];
        return colorScale[4];
    }

    // Add county polygons to the map with styles based on school count
    L.geoJSON(countyData, {
        style: feature => ({
            color: '#000',
            weight: 1,
            fillColor: getColor(feature.properties.schoolCount),
            fillOpacity: 0.7
        }),
        onEachFeature: (feature, layer) => {
            const countyName = feature.properties.Name || 'Unnamed County';
            const schoolCount = feature.properties.schoolCount || 0;

            // Debugging: check feature data before binding popup
            console.log('County Feature:', feature);

            layer.bindPopup(`<strong>${countyName} county</strong><br>Schools: ${schoolCount}`);
        }
    }).addTo(map);

    // Add school points to the map
    L.geoJSON(schoolData, {
        pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
            radius: 2,
            fillColor: '#ff7800',
            color: '#000',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        }),
        onEachFeature: (feature, layer) => {
            const schoolName = feature.properties.Institution_Name_Line1 || 'Unnamed School';
            const address = feature.properties.Mail_Address_Line1 || 'No Address';
            const city = feature.properties.Mail_City || 'No City';

            // Debugging: check feature data before binding popup
            console.log('School Feature:', feature);

            layer.bindPopup(`<strong>${schoolName}</strong><br>${address}<br>${city}, OR`);
        }
    }).addTo(map);
}

// Add legend to the map
function addLegend() {
    const legend = L.control({ position: 'bottomright' });

    legend.onAdd = function () {
        const div = L.DomUtil.create('div', 'info legend');
        const breaks = [0, 10, 20, 60, 100];
        const colors = ['#feedde', '#fdbe85', '#fd8d3c', '#e6550d', '#a63603'];

        div.innerHTML = '<h4>Schools per County</h4>';
        for (let i = 0; i < breaks.length; i++) {
            const from = breaks[i];
            const to = breaks[i + 1];
            div.innerHTML += `<i style="background:${colors[i]}; width:18px; height:18px; display:inline-block; margin-right:8px;"></i> ${to ? `${from}–${to}` : `${from}+`}<br>`;
        }

        return div;
    };

    legend.addTo(map); // Ensure map is ready
}

// Load GeoJSON data
//function loadData() {
    Promise.all([
        fetch('data/OrCoPOly.geojson').then(res => res.json()),
        fetch('data/ORHS2.geojson').then(res => res.json())
    ])
    .then(([countyData, schoolData]) => {

        symbolizeCountiesByschool(countyData, schoolData); // Process data with Turf.js
        addLegend(); // Add the legend only once map and data are ready
    })
    .catch(error => console.error('Error loading data:', error));
//}

// Initialize map
createMap();
