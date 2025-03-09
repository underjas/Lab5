let map2; // Declare the map variable 

// Create the Leaflet map
function createMap2() {
    map2 = L.map('map2', {
        center: [44, -120.5], // Center on Oregon
        zoom: 7 // State level zoom
    });

    // Add base tile layer from Stadia maps
    L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key=4c175b69-da77-4ffe-b10b-9edb2c25a733', {
        attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        minZoom: 5,
        maxZoom: 12
    }).addTo(map2);
}

// Add school points
function addSchoolPoints(schoolData) {
    L.geoJSON(schoolData, {
        pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
            radius: 2,
            fillColor: '#ff7800',
            color: '#000',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.9
        }),
        onEachFeature: (feature, layer) => {
            layer.bindPopup(`
                <strong>${feature.properties.Institution_Name_Line1 || 'Unnamed School'}</strong><br>
                 ${feature.properties.Mail_Address_Line1 || 'N/A'}<br>
                 ${feature.properties.Mail_City || 'N/A'}, OR
            `);
        }
    }).addTo(map2);
}

// Classify counties by the number of schools using Turf.js
const breaks = [0.0004, 0.001, 0.002, 0.004];
const colorScale = ['#feedde', '#fdbe85', '#fd8d3c', '#e6550d', '#a63603'];

function getColor(perCapita) {
    if (perCapita <= breaks[0]) return colorScale[0];
    if (perCapita <= breaks[1]) return colorScale[1];
    if (perCapita <= breaks[2]) return colorScale[2];
    if (perCapita <= breaks[3]) return colorScale[3];
    return colorScale[4];
}

function symbolizeCountiesBySchools(countyData, schoolData) {
    countyData.features.forEach(county => {
        if (!county.geometry || !['Polygon', 'MultiPolygon'].includes(county.geometry.type)) {
            county.properties.schoolCount = 0;
            return;
        }

        const validSchools = {
            type: 'FeatureCollection',
            features: schoolData.features.filter(school => school.geometry && school.geometry.type === 'Point')
        };

        const schoolsInCounty = turf.pointsWithinPolygon(validSchools, county);
        const schoolCount = schoolsInCounty.features.length;
        const population = county.properties.population || 1;
        county.properties.schoolsPerCapita = schoolCount / population;
        county.properties.schoolCount = schoolCount;
    });

    L.geoJSON(countyData, {
        style: feature => ({
            color: '#000',
            weight: 1,
            fillColor: getColor(feature.properties.schoolsPerCapita),
            fillOpacity: 0.7
        }),
        onEachFeature: (feature, layer) => {
            const populationPerSchool = feature.properties.schoolCount > 0 ? (feature.properties.population / feature.properties.schoolCount).toFixed(0) : 0;
            layer.bindPopup(`
                <strong>${feature.properties.Name || 'Unnamed County'} County</strong><br>
                Schools: ${feature.properties.schoolCount}<br>
                Population: ${feature.properties.population}<br>
                Pop. per school: ${populationPerSchool}
            `);
        }
    }).addTo(map2);

    addLegend2(); // Call the legend function after counties are added
}

// Add a legend to the map
function addLegend2() {
    const legend = L.control({ position: 'bottomright' });

    legend.onAdd = function () {
        const div = L.DomUtil.create('div', 'info legend');
        div.innerHTML = '<h4>Schools per Population</h4>';

        const populationBreaks = breaks.map(b => Math.round(1 / b).toLocaleString());

        for (let i = 0; i < breaks.length; i++) {
            div.innerHTML +=
                `<i style="background:${colorScale[i]}"></i> ` +
                (i === 0 ? `1 school per ≥ ${populationBreaks[i]} people` 
                          : `1 school per ${populationBreaks[i]} - ${populationBreaks[i - 1]} people`) +
                '<br>';
        }
        div.innerHTML += `<i style="background:${colorScale[colorScale.length - 1]}"></i> 1 school per < ${populationBreaks[populationBreaks.length - 1]} people`;

        return div;
    };

    legend.addTo(map2);
}

// Fetch both GeoJSON files and call the functions
Promise.all([
    fetch('data/OrCoPOly.geojson').then(res => res.json()),
    fetch('data/ORHS2.geojson').then(res => res.json())
])
.then(([countyData, schoolData]) => {
    symbolizeCountiesBySchools(countyData, schoolData); // Add symbolized counties
    addSchoolPoints(schoolData); // Add points on top
})
.catch(error => console.error('Error loading data:', error));

// Initialize the map
createMap2();
