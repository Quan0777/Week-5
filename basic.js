const geoUrl = "https://geo.stat.fi/geoserver/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=tilastointialueet:kunta4500k&outputFormat=json&srsName=EPSG:4326";
const apiUrl = "https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/muutl/11a2.px";

const fetchData = async () => {
    const res = await fetch(geoUrl);
    const geoData = await res.json();
    const migrationData = await fetchQuery();
    initMap(geoData, migrationData);
};

async function fetchQuery() {
    const queryRes = await fetch("./migration_data_query.json");
    const query = await queryRes.json();
    const res = await fetch(apiUrl, {
        method: "POST",
        body: JSON.stringify(query),
    });
    return await res.json();
}

const initMap = (data, migrationData) => {
    let map = L.map('map', {
        minZoom: -3
    });

    const areaKey = migrationData.id[0];
    let areaIndex = migrationData.dimension[areaKey].category.index;
    let values = migrationData.value;

    const getMigration = (feature) => {
        const i = areaIndex["KU" + feature.properties.kunta];
        if (i === undefined) return null;
        return {
            positive: values[2 * i],
            negative: values[2 * i + 1],
        };
    };

    const getColor = (feature) => {
        const m = getMigration(feature);
        let hue = Math.pow(m.positive / m.negative, 3) * 60;    
        hue = Math.min(hue, 120);
        return `hsl(${hue}, 75%, 50%)`;
    };

    let geoJson = L.geoJSON(data, {
        style: (feature) => {
            const color = getColor(feature);
            return {
                weight: 2,
                color: color,
                fillColor: color,
                fillOpacity: 0.6,
            };
        },
        onEachFeature: (feature, layer) => {
            const name = feature.properties.name;
            const m = getMigration(feature);
            const positive = m ? m.positive : "no data";
            const negative = m ? m.negative : "no data";

            layer.bindTooltip(name);
            layer.bindPopup(`
                <ul>
                    <li>Positive migration: ${positive}</li>
                    <li>Negative migration: ${negative}</li>
                </ul>
            `);
        }
    }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    map.fitBounds(geoJson.getBounds());
};

fetchData();