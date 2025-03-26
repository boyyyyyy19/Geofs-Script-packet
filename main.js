// ==UserScript==
// @name         GeoFS All-in-One Addon
// @version      1.0.1
// @description  Combines functionalities from various GeoFS addons for an enhanced simulation experience.
// ==/UserScript==



// ==GeoFS Streetlights==
(function() {
    // Streetlights initialization code
    // ==UserScript==
// @name         GeoFS Streetlights
// @version      0.4
// @description  Uses OSM to add street lights on the edges of roads
// @author       GGamerGGuy
// @match        https://geo-fs.com/geofs.php*
// @match        https://*.geo-fs.com/geofs.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geo-fs.com
// @grant        none
// ==/UserScript==
const workerScript = () => {
    // Function to interpolate points between two coordinates
    function interpolatePoints(coord1, coord2, distance) {
        const [lat1, lon1] = coord1;
        const [lat2, lon2] = coord2;

        const dLat = lat2 - lat1;
        const dLon = lon2 - lon1;
        const segmentLength = Math.sqrt(dLat * dLat + dLon * dLon);
        const numPoints = Math.ceil(segmentLength / distance);

        const interpolatedPoints = [];
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            const lat = lat1 + t * dLat;
            const lon = lon1 + t * dLon;
            interpolatedPoints.push([lat, lon]);
        }
        return interpolatedPoints;
    }

    // Function to calculate the offset position for streetlights
    function offsetCoordinate(coord, angle, offsetDistance) {
        const [lat, lon] = coord;
        const earthRadius = 6371000; // Earth radius in meters

        const offsetLat = lat + (offsetDistance / earthRadius) * (180 / Math.PI) * Math.cos(angle);
        const offsetLon = lon + (offsetDistance / earthRadius) * (180 / Math.PI) * Math.sin(angle) / Math.cos(lat * Math.PI / 180);

        return [offsetLat, offsetLon];
    }
    function inCoords(a, b) { //checks if A is in B.
        if ((a[0] >= b[0] && a[0] <= b[2]) && (a[1] >= b[1] && a[1] <= b[3])) {
            return true;
        }
        return false;
    }
    const updateRoads = async function(coords, stLtDist, airportBounds) {
        var allSPos = [];
        coords.forEach(road => {
            for (let i = 0; i < road.length - 1; i++) {
                const segmentStart = road[i];
                const segmentEnd = road[i + 1];

                // Calculate angle of the segment for orientation
                const angle = Math.atan2(segmentEnd[1] - segmentStart[1], segmentEnd[0] - segmentStart[0]);

                const interpolatedPoints = interpolatePoints(segmentStart, segmentEnd, Number(stLtDist) / 111000); // 60 meters by default, converted to degrees

                interpolatedPoints.forEach(point => {
                    // Offset points to the left and right of the road centerline
                    const leftPoint = offsetCoordinate(point, angle + Math.PI / 2, 5); // 5 meters to the left
                    const rightPoint = offsetCoordinate(point, angle - Math.PI / 2, 5); // 5 meters to the right
                    var shouldSendL = true;
                    var shouldSendR = true;
                    for (var i in allSPos) {
                        if ((Math.abs(leftPoint[0] - allSPos[i][0]) < (5/111000)) && (Math.abs(leftPoint[1] - allSPos[i][1]) < (5/111000))) {
                            shouldSendL = false;
                        }
                        if ((Math.abs(rightPoint[0] - allSPos[i][0]) < (5/111000)) && (Math.abs(rightPoint[1] - allSPos[i][1]) < (5/111000))) {
                            shouldSendR = false;
                        }
                        if (!shouldSendL && !shouldSendR) {
                            break;
                        }
                    }

                    // Add streetlights at the left point
                    if (shouldSendL) {
                        allSPos.push(leftPoint);
                        let b = false;
                        for (let i in airportBounds) {
                            if (inCoords(leftPoint, airportBounds[i])) {
                                b = true;
                            }
                        }
                        self.postMessage({type: ((!b) ? "addStreetlight" : "addFloodlight"), data: [leftPoint, angle]});
                    }

                    // Add streetlights at the right point
                    if (shouldSendR) {
                        allSPos.push(rightPoint);
                        let b = false;
                        for (let i in airportBounds) {
                            if (inCoords(rightPoint, airportBounds[i])) {
                                b = true;
                            }
                        }
                        self.postMessage({type: ((!b) ? "addStreetlight" : "addFloodlight"), data: [rightPoint, angle + Math.PI]});
                    }
                });
            }
        });
        self.postMessage({type: "streetLightsFinished"});
    };
    // Worker thread (in worker.js)
    function calculateDistance(coord1, coord2) {
        const [lat1, lon1] = coord1;
        const [lat2, lon2] = coord2;
        const earthRadius = 6371000; // Earth radius in meters

        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);

        const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) ** 2;

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return earthRadius * c;
    }

    function removeCloseLights(lights) {
        var removeIndices = [];
        var removedIndices = new Set();

        for (var i = 0; i < lights.length; i++) {
            if (!removedIndices.has(i)) {
                for (var j = i + 1; j < lights.length; j++) {
                    var distLat = Math.abs(lights[j][0][0] - lights[i][0][0]);
                    var distLon = Math.abs(lights[j][0][1] - lights[i][0][1]);
                    if ((distLat < (5/111111) && distLon < (5/111111)) && !removedIndices.has(j)) {
                        removeIndices.push(lights[j][1]);
                        removedIndices.add(j);
                    }
                }
            }
        }

        console.log("Removing " + removeIndices.length + " streetlights...");
        return removeIndices;
    }


    ///
    // Function to extract coordinates from OSM data. It also filters out nodes that are too close together.
    function extractCoordinates(data) {
        const nodes = new Map();

        // Extract nodes with their coordinates
        data.elements.forEach(element => {
            if (element.type === 'node') {
                nodes.set(element.id, [element.lat, element.lon]);
            }
        });
        // Extract ways and their coordinates
        const roads = [];
        const filteredCoordinates = [];
        data.elements.forEach(element => {
            if (element.type === 'way' && element.tags && element.tags.highway) {
                const wayCoordinates = element.nodes
                .map(nodeId => nodes.get(nodeId))
                .filter(coord => coord); // Filter out any undefined nodes
                roads.push(wayCoordinates);
            }
        });

        return roads;
    }
    ///
    async function getAirportBounds(bounds) {
        const q = `
        [out:json];
        (
        nwr(around:20000, ${bounds[0]}, ${bounds[1]})["aeroway"="aerodrome"];
        );
        out geom;
        `;
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`;
        const response = await fetch(url);
        const data = await response.json();
        var ret = [];
        let b, d;
        for (let i = 0; i < data.elements.length; i++) {
            d = data.elements[i];
            if (d.bounds) {
                b = d.bounds;
                ret.push([b.minlat, b.minlon, b.maxlat, b.maxlon]);
            }
        }
        return ret;
    }
    self.addEventListener('message', async function(event) {
        if (event.data.type == 'fetchRoadData') {
            console.log("Fetching Road Data...");
            const bounds = event.data.data[0];
            const stLtDist = event.data.data[1];
            console.log("received bounds: " + bounds);
            var airportBounds = getAirportBounds(bounds.split(", "));
            const query = `
    [out:json];
(
  way[highway=motorway](${bounds});
  way[highway=trunk](${bounds});
  way[highway=primary](${bounds});
  way[highway=secondary](${bounds});
  way[highway=tertiary](${bounds});
  way[highway=residential](${bounds});
  way[highway=service](${bounds});
  way[highway=escape](${bounds});
  way[highway=raceway](${bounds});
);
(._;>;);
out body;
    `;
            const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Error fetching data: ${response.statusText}`);
                }

                const data = await response.json();
                const coordinates = extractCoordinates(data);
                var aB;
                await airportBounds.then((r) => {aB = r});
                updateRoads(coordinates, stLtDist, aB);
            } catch (error) {
                console.error('Error:', error);
            }
        } else if (event.data.type == "removeCloseStreetLights") {
            var indices = removeCloseLights(event.data.data); //data should be rPos
            self.postMessage({type: "removeCloseStreetLights", data: indices});
        }
    });
};
//Main function
(async function() {
    'use strict';
    window.roads = [];
    //I have forgotten what most of these position arrays are for
    window.rPos = [];
    window.fPos = [];
    window.slPos = []; //Instancing positions
    window.slOri = []; //Instancing orientations
    window.fldPos = []; //Floodlight positions
    window.fldOri = []; //Floodlight orientations
    window.allSPos = []; //All Streetlight Positions
    /*if (localStorage.getItem('stLtEnabled')) {
        window.isStLtOn = localStorage.getItem('stLtEnabled');
    } else {
        localStorage.setItem('stLtEnabled', 'true');
        window.isStLtOn = 'true';
    }
    if (localStorage.getItem('stLtRenderDist') == null) {
        localStorage.setItem('stLtRenderDist', '0.003');
    }
    if (localStorage.getItem('stLtUpdateInterval') == null) {
        localStorage.setItem('stLtUpdateInterval', '5');
    }
    if (localStorage.getItem('stLtDist') == null) {
        localStorage.setItem('stLtDist', '60');
    }*/
    window.rdslastBounds;
    window.slLOD = false;
    window.ltTO = 0; //lightTimeOut, sets the timeout for light placing to hopefully reduce freezing
    window.streetLightWorker = new Worker(URL.createObjectURL(new Blob([`(${workerScript})()`], { type: 'application/javascript' })));
    window.streetLightWorker.addEventListener('message', function(event) {
        if (event.data.type == "addStreetlight") {


            const position = event.data.data[0];
            const heading = event.data.data[1];
            const apos = [position[1], position[0], window.geofs.api.viewer.scene.globe.getHeight(window.Cesium.Cartographic.fromDegrees(position[1], position[0]))];
            const pos = window.Cesium.Cartesian3.fromDegrees(apos[0], apos[1], apos[2]);
            window.slPos.push(pos);

            // Adjust orientation based on the heading
            const hpr = new window.Cesium.HeadingPitchRoll(heading, 0, 0);
            const ori = window.Cesium.Transforms.headingPitchRollQuaternion(pos, hpr);
            window.slOri.push(ori);


        } else if (event.data.type == "addFloodlight") {
            const position = event.data.data[0];
            const heading = event.data.data[1];
            const apos = [position[1], position[0], window.geofs.api.viewer.scene.globe.getHeight(window.Cesium.Cartographic.fromDegrees(position[1], position[0]))];
            const pos = window.Cesium.Cartesian3.fromDegrees(apos[0], apos[1], apos[2]);
            window.fldPos.push(pos);

            // Adjust orientation based on the heading
            const hpr = new window.Cesium.HeadingPitchRoll(heading, 0, 0);
            const ori = window.Cesium.Transforms.headingPitchRollQuaternion(pos, hpr);
            window.fldOri.push(ori);

        } else if (event.data.type == "removeCloseStreetLights") {
            console.log("Chat, I'm cooked");
            removeStreetLights(event.data.data);
        } else if (event.data.type == "streetLightsFinished") {
            console.log("streetLightsFinished");
            instanceStLts();
            instanceFldLts();
        }
    });
    if (!window.gmenu || !window.GMenu) {
        console.log("Streetlights getting GMenu");
        fetch('https://raw.githubusercontent.com/tylerbmusic/GeoFS-Addon-Menu/refs/heads/main/addonMenu.js')
            .then(response => response.text())
            .then(script => {eval(script);})
            .then(() => {setTimeout(afterGMenu, 100);});
    }
    function afterGMenu() {
        const stLtMenu = new window.GMenu("Streetlights", "stLt");
        stLtMenu.addItem("Render Distance (degrees): ", "RenderDist", "number", 0, "0.003");
        stLtMenu.addItem("Update Interval (seconds): ", "UpdateInterval", "number", 0, "5");
        stLtMenu.addItem("Distance between Streetlights (meters): ", "Dist", "number", 0, "60");
        setInterval(() => {
            window.doRoads();
            setTimeout(() => {window.streetLightLOD();}, 3500);
        }, 1000*Number(localStorage.getItem('stLtUpdateInterval')));
    }
})();

window.streetLightLOD = async function() {
    var ldgAGL = (window.geofs.animation.values.altitude !== undefined && window.geofs.animation.values.groundElevationFeet !== undefined) ? ((window.geofs.animation.values.altitude - window.geofs.animation.values.groundElevationFeet) + (window.geofs.aircraft.instance.collisionPoints[window.geofs.aircraft.instance.collisionPoints.length - 2].worldPosition[2]*3.2808399)) : 'N/A';
    var i;
    if ((ldgAGL > 3000 || window.weather.timeRatio < 0.5) && !window.slLOD) {
        window.slLOD = true;
        for (i = 0; i < window.roads.length; i++) {
            window.roads[i].model.uri = "https://raw.githubusercontent.com/tylerbmusic/GPWS-files_geofs/refs/heads/main/streetlight_lod.glb";
        }
    } else if ((ldgAGL <= 3000 && window.weather.timeRatio >= 0.5) && window.slLOD) {
        window.slLOD = false;
        for (i = 0; i < window.roads.length; i++) {
            window.roads[i].model.uri = "https://raw.githubusercontent.com/tylerbmusic/GPWS-files_geofs/refs/heads/main/streetlight_coned.glb";
        }
    }
};
window.doRoads = async function() {
    window.ltTO = 0;
    var ldgAGL = (window.geofs.animation.values.altitude !== undefined && window.geofs.animation.values.groundElevationFeet !== undefined) ? ((window.geofs.animation.values.altitude - window.geofs.animation.values.groundElevationFeet) + (window.geofs.aircraft.instance.collisionPoints[window.geofs.aircraft.instance.collisionPoints.length - 2].worldPosition[2]*3.2808399)) : 'N/A';
    if (window.geofs.cautiousWithTerrain == false && (localStorage.getItem("stLtEnabled") == "true") && ldgAGL < 3000) {
        var renderDistance = Number(localStorage.getItem('stLtRenderDist')); // Render distance, in degrees.
        var l0 = Math.floor(window.geofs.aircraft.instance.llaLocation[0] / renderDistance) * renderDistance;
        var l1 = Math.floor(window.geofs.aircraft.instance.llaLocation[1] / renderDistance) * renderDistance;
        window.bounds = Math.round(l0*1000)/1000 + ", " + Math.round(l1*1000)/1000 + ", " + Math.round((l0 + renderDistance)*1000)/1000 + ", " + Math.round((l1 + renderDistance)*1000)/1000;
        if (!window.rdslastBounds || (window.rdslastBounds != window.bounds)) {
            // Remove existing roads
            for (let i = 0; i < window.roads.length; i++) {
                window.geofs.api.viewer.scene.primitives.remove(window.roads[i]);
            }
            window.roads = [];
            window.slPos = [];
            window.slOri = [];
            window.fldPos = [];
            window.fldOri = [];
            console.log("Roads removed, placing new ones");
            // Place new roads
            console.log("bounds: " + window.bounds);
            window.streetLightWorker.postMessage({type: "fetchRoadData", data: [window.bounds, localStorage.getItem("stLtDist")]});
        }
        window.rdslastBounds = window.bounds;
    } else if (window.geofs.cautiousWithTerrain == false && (window.stLtOn == 'false')) { //If the StLt isn't on
        // Remove existing roads
        window.rdslastBounds = "";
        for (let i = 0; i < window.roads.length; i++) {
            window.geofs.api.viewer.scene.primitives.remove(window.roads[i]);
        }
        window.roads = [];
        window.slPos = [];
        window.slOri = [];
        window.fldPos = [];
        window.fldOri = [];
    }
};

// Function to fetch road data from OSM using the Overpass API
async function removeStreetLights(arr) {
    console.log("removing Streetlights");
    for (var i in arr) {
        window.geofs.api.viewer.entities.remove(window.roads[arr[i]]);
    }
}


// Function to calculate distance between two coordinates in meters
function calculateDistance(coord1, coord2) {
    const [lat1, lon1] = coord1;
    const [lat2, lon2] = coord2;
    const earthRadius = 6371000; // Earth radius in meters

    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a = Math.sin(dLat / 2) ** 2 +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadius * c;
}

async function instanceStLts() {
    const modelMatrices = window.slPos.map((position, index) => {
        const translationMatrix = /*window.Cesium.Transforms.northEastDownToFixedFrame*/window.Cesium.Matrix4.fromTranslation(position);

        // Convert quaternion to rotation matrix
        const rotationMatrix = window.Cesium.Matrix3.fromQuaternion(window.slOri[index]);

        // Apply rotation to translation
        return window.Cesium.Matrix4.multiplyByMatrix3(translationMatrix, rotationMatrix, new window.Cesium.Matrix4());
    });
    window.roads.push(window.geofs.api.viewer.scene.primitives.add(
        new window.Cesium.ModelInstanceCollection({
            url: "https://raw.githubusercontent.com/tylerbmusic/GPWS-files_geofs/refs/heads/main/streetlight_coned.glb",
            instances: modelMatrices.map((matrix) => ({ modelMatrix: matrix })),
        })
    )
                     );
}
async function instanceFldLts() {
    const modelMatrices = window.fldPos.map((position, index) => {
        const translationMatrix = /*window.Cesium.Transforms.northEastDownToFixedFrame*/window.Cesium.Matrix4.fromTranslation(position);

        // Convert quaternion to rotation matrix
        const rotationMatrix = window.Cesium.Matrix3.fromQuaternion(window.fldOri[index]);

        // Apply rotation to translation
        return window.Cesium.Matrix4.multiplyByMatrix3(translationMatrix, rotationMatrix, new window.Cesium.Matrix4());
    });
    window.roads.push(window.geofs.api.viewer.scene.primitives.add(
        new window.Cesium.ModelInstanceCollection({
            url: "https://raw.githubusercontent.com/tylerbmusic/GPWS-files_geofs/refs/heads/main/floodlight.glb",
            instances: modelMatrices.map((matrix) => ({ modelMatrix: matrix })),
        })
    )
                     );
}

async function addStreetlight(position, heading) {
    window.ltTO += 1;
    setTimeout(() => {
        const apos = [position[1], position[0], window.geofs.api.viewer.scene.globe.getHeight(window.Cesium.Cartographic.fromDegrees(position[1], position[0]))];
        const pos = window.Cesium.Cartesian3.fromDegrees(apos[0], apos[1], apos[2]);

        // Adjust orientation based on the heading
        const hpr = new window.Cesium.HeadingPitchRoll(heading, 0, 0);
        const ori = window.Cesium.Transforms.headingPitchRollQuaternion(pos, hpr);
        window.rPos.push([position, window.roads.length]);
        window.roads.push(
            window.geofs.api.viewer.entities.add({
                name: "streetlight",
                position: pos,
                orientation: ori,
                model: {
                    uri: "https://raw.githubusercontent.com/tylerbmusic/GPWS-files_geofs/refs/heads/main/streetlight_coned.glb",
                    minimumPixelSize: 64,
                    maximumScale: 1
                },
                translucencyByDistance: new window.Cesium.NearFarScalar(1e2, 1.0, 5e2, 0.0)
            })
        );
    }, window.ltTO);
}
///
// Function to remove streetlights with x and y values within 5 of each other
window.removeCloseStreetlights = async function() {
    const cellSize = 5; // Grid cell size in meters
    const grid = new Map();
    const indicesToRemove = new Set();

    // Function to get a cell key
    const getCellKey = ([x, y]) => `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)}`;

    // Populate grid with streetlights for spatial indexing
    for (let i = 0; i < window.rPos.length; i++) {
        const pos = window.rPos[i][0];
        const cellKey = getCellKey(pos);

        if (!grid.has(cellKey)) grid.set(cellKey, []);
        grid.get(cellKey).push(i);
    }

    // Check each cell and its neighbors
    for (let [cellKey, indices] of grid) {
        const [cellX, cellY] = cellKey.split(',').map(Number);

        // Check the cell and its 8 neighbors
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const neighborKey = `${cellX + dx},${cellY + dy}`;
                const neighborIndices = grid.get(neighborKey) || [];

                for (let i = 0; i < indices.length; i++) {
                    const index1 = indices[i];
                    const pos1 = window.rPos[index1][0];

                    for (let j = 0; j < neighborIndices.length; j++) {
                        const index2 = neighborIndices[j];
                        if (index1 >= index2) continue;

                        const pos2 = window.rPos[index2][0];
                        const distance = calculateDistance(pos1, pos2);

                        if (distance <= 5) indicesToRemove.add(index2);
                    }
                }
            }
        }
    }

    // Batch remove streetlights in reverse order to avoid index shifting issues
    const sortedIndices = Array.from(indicesToRemove).sort((a, b) => b - a);
    for (const index of sortedIndices) {
        window.geofs.api.viewer.entities.remove(window.roads[index]);
    }

    // Clean up arrays
    for (const index of sortedIndices) {
        window.rPos.splice(index, 1);
        window.roads.splice(index, 1);
    }

    console.log(`${sortedIndices.length} streetlights removed.`);
};
    function initStreetlights() {
        // Example: Add streetlights to the simulation
        console.log('GeoFS Streetlights Initialized');
        // Additional code to add streetlights
    }
    initStreetlights();
})();
// ==/GeoFS Streetlights==

// ==GeoFS Faster FPS==
(function() {
    // FPS optimization code
    // ==UserScript==
// @name         GeoFS More FPS
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Get more fps!!!
// @author       Writer by ChatGPT & Edited by IndonesiaBoy
// @match        https://www.geo-fs.com/geofs.php?v=*
// @match        https://*.geo-fs.com/geofs.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geo-fs.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Maximal FPS settings (default: 60)
    const maxFPS = 144;

    // Change FPS settings
    let lastTime = 0;
    const setFrameRate = () => {
        const now = performance.now();
        if (now - lastTime > 1000 / maxFPS) {
            lastTime = now;
            // Rerun frames or rendering here
        }
    };

    // Interval to keep FPS is high
    setInterval(setFrameRate, 0);
})();
    function optimizeFPS() {
        // Example: Adjust settings for better FPS
        console.log('GeoFS FPS Optimization Initialized');
        // Additional code to optimize FPS
    }
    optimizeFPS();
})();
// ==/GeoFS Faster FPS==

// ==GeoFS Taxiway Signs==
(function() {
    // Taxiway signs initialization code
    // ==UserScript==
// @name         GeoFS Taxiway Signs
// @version      0.2
// @description  Adds taxiway sign board things
// @author       GGamerGGuy
// @match        https://geo-fs.com/geofs.php*
// @match        https://*.geo-fs.com/geofs.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geo-fs.com
// @grant        none
// ==/UserScript==
const workerScript = () => {
    //This function was written by AI
    function calculateAngle(p1, p2, p3) {
        if (p1 && p2 && p3) {
            const dx1 = p2[1] - p1[1];
            const dy1 = p2[0] - p1[0];
            const dx2 = p3[1] - p2[1];
            const dy2 = p3[0] - p2[0];

            const mag1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
            const mag2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

            if (mag1 === 0 || mag2 === 0) {
                return null; // Return null if vectors are zero-length
            }

            let cosineAngle = (dx1 * dx2 + dy1 * dy2) / (mag1 * mag2);
            cosineAngle = Math.min(1, Math.max(-1, cosineAngle)); // Clamp to [-1, 1]

            const angle = Math.acos(cosineAngle);
            return angle * (180 / Math.PI); // Convert to degrees
        }
        return null; // Default return value if points are missing
    }
    //This function was partially written with AI.
    async function getTwMData(bounds) {
        const overpassUrl = 'https://overpass-api.de/api/interpreter';
        const query = `[out:json];(
            way["aeroway"="taxiway"]({{bbox}});
            way["aeroway"="runway"]({{bbox}});
        );
        out body;
        >;
        out skel qt;
    `;
        const bbox = bounds;

        try {
            const response = await fetch(`${overpassUrl}?data=${encodeURIComponent(query.replaceAll('{{bbox}}', bbox))}`);
            const data = await response.json();
            console.log(data);
            return data;
        } catch (error) {
            console.log(error);
        }
    }
    async function getTwM(bounds, twSAngle) {
        var theNodes;
        var theWays = {};
        getTwMData(bounds).then(twMD => {
            const nodeWays = {};
            const intersections = [];
            const nodes = [];
            twMD.elements.forEach(e => { //e=element
                if (e.type == 'node') {
                    nodes[e.id] = [e.lat, e.lon];
                }
            });
            theNodes = nodes;

            // Collect the taxiway names for each node
            twMD.elements.forEach(element => {
                if (element.type === 'way' && element.tags && element.tags.ref) {
                    const taxiwayName = element.tags.ref;
                    console.log([element.tags.ref, element.nodes]);
                    theWays[element.tags.ref] = element.nodes;
                    element.nodes.forEach(nodeId => {
                        if (!nodeWays[nodeId]) {
                            nodeWays[nodeId] = new Set();
                        }
                        nodeWays[nodeId].add(taxiwayName);
                    });
                }
            });
            var toFilter = [];
            // Function to filter out nodes based on angles
            for (let w in theWays) {
                let toFilter = [];

                for (let n = theWays[w].length - 2; n > 0; n--) {
                    let angle = calculateAngle(theNodes[theWays[w][n - 1]], theNodes[theWays[w][n]], theNodes[theWays[w][n + 1]]);

                    // Adjust threshold if needed
                    if (angle > Number(twSAngle) && angle < 40) { //LocSt twSAngle
                        toFilter.push(n);
                    } else {
                        console.log(`Skipped node ${n} with angle: ${angle}`); // Debug: log skipped nodes
                    }
                }

                // Remove nodes in reverse to avoid index shift
                for (let i = toFilter.length - 1; i >= 0; i--) {
                    let index = toFilter[i];
                    console.log(`Removing node ${index} with angle: ${calculateAngle(theNodes[theWays[w][index - 1]], theNodes[theWays[w][index]], theNodes[theWays[w][index + 1]])}`); // Debug: log removed nodes
                    theWays[w].splice(index, 1);
                }
            }


            // Filter nodes that are intersections (appear in multiple ways)
            twMD.elements.forEach(element => {
                if (element.type === 'node' && nodeWays[element.id] && nodeWays[element.id].size > 1) {
                    const intersectingTaxiways = Array.from(nodeWays[element.id]).join(" ");
                    intersections.push([element.lat, element.lon, intersectingTaxiways, element.id]);
                }
            });
            var twSize = 0;
            for (var i in twMD.elements) {
                if (twMD.elements[i].type == 'way' && twMD.elements[i].tags.aeroway == 'runway' && twMD.elements[i].tags.width && Number(twMD.elements[i].tags.width) > twSize) {
                    twSize = Number(twMD.elements[i].tags.width);
                }
            }
            if (twSize == 0) {
                console.log("twSize == 0");
                twSize = 45;
            }
            const theData = {data: intersections, theNodes: theNodes, theWays: theWays, twSize: twSize};
            self.postMessage({type: "getTwM", data: theData});
        });
    }
    self.addEventListener('message', function(event) {
        if (event.data.type == 'getTwM') {
            getTwM(event.data.data[0], event.data.data[1]);
        }
    });
};
(function() {
    'use strict';
    window.twM = [];
    window.theWays = [];
    window.theNodes = [];
    window.twSignWorker = new Worker(URL.createObjectURL(new Blob([`(${workerScript})()`], { type: 'application/javascript' })));
    window.twSignWorker.addEventListener('message', function(event) {
        if (event.data.type == 'getTwM' && (localStorage.getItem("twSEnabled") == "true")) {
            window.theWays = event.data.data.theWays;
            window.theNodes = event.data.data.theNodes;
            window.twSize = event.data.data.twSize / 3;
            window.setTwM(event.data.data.data); //That's a lot of data!
        } else if (event.data.type == 'testLabel') {
            var pos = event.data.data.pos;
            window.geofs.api.viewer.entities.add({
                position: window.Cesium.Cartesian3.fromDegrees(pos[0], pos[1], window.geofs.api.viewer.scene.globe.getHeight(window.Cesium.Cartographic.fromDegrees(pos[0], pos[1]))),
                label: {
                    text: event.data.data.text
                }
            });
        }
    });
    if (!window.gmenu || !window.GMenu) {
        fetch('https://raw.githubusercontent.com/tylerbmusic/GeoFS-Addon-Menu/refs/heads/main/addonMenu.js')
            .then(response => response.text())
            .then(script => {eval(script);})
            .then(() => {setTimeout(afterGMenu, 100);});
    }
    function afterGMenu() {
        const twSM = new window.GMenu("Taxiway Signs", "twS");
        twSM.addItem("Render distance (degrees): ", "RenderDist", "number", 0, 0.05);
        twSM.addItem("Update Interval (seconds): ", "UpdateInterval", "number", 0, 4);
        twSM.addItem("Filter Angle (Filters taxiway points greater than the specified angle): ", "Angle", "number", 0, 1);
        //twSM.addItem("desc", "ls", "type", 0, "defaultValue");
        setInterval(() => {window.updateMarkers();}, 1000*Number(localStorage.getItem("twSUpdateInterval"))); //LocSt twSUpdateInterval
    }
})();
window.updateMarkers = async function() {
    if (window.geofs.cautiousWithTerrain == false) {
        var renderDistance = Number(localStorage.getItem("twSRenderDist")); //Render distance, in degrees. //LocSt twSRenderDist
        var l0 = Math.floor(window.geofs.aircraft.instance.llaLocation[0]/renderDistance)*renderDistance;
        var l1 = Math.floor(window.geofs.aircraft.instance.llaLocation[1]/renderDistance)*renderDistance;
        var bounds = (l0) + ", " + (l1) + ", " + (l0+renderDistance) + ", " + (l1+renderDistance);
        if (!window.MLastBounds || (window.MLastBounds != bounds)) {
            //Remove existing markers
            for (var i = 0; i < window.twM.length; i++) {
                window.geofs.api.viewer.entities.remove(window.twM[i]);
            }
            window.twM = [];
            window.theWays = [];
            window.theNodes = [];
            console.log("Markers removed, placing new ones");
            //Place new markers
            window.twSignWorker.postMessage({type: "getTwM", data: [bounds, localStorage.getItem("twSAngle")]});
        }
        window.MLastBounds = bounds;
    }
}
function offsetCoordinate(coord, angle, offsetDistance) {
    const [lat, lon, int, id] = coord;
    const earthRadius = 6371000; // Earth radius in meters

    const offsetLat = lat + (offsetDistance / earthRadius) * (180 / Math.PI) * Math.cos(angle);
    const offsetLon = lon + (offsetDistance / earthRadius) * (180 / Math.PI) * Math.sin(angle) / Math.cos(lat * Math.PI / 180);

    return [offsetLat, offsetLon];
}
window.setTwM = async function(intersections) {
    var heading = 0; //HEADING IS IN RADIANS!
    console.log(intersections);
    intersections.forEach(epos => {
        //heading = Math.atan2(segmentEnd[1] - segmentStart[1], segmentEnd[0] - segmentStart[0]);
        const splitTw = epos[2].split(" ");
        for (var hFlip = 0; hFlip <= 1; hFlip++) { //headingFlip, in a couple of years I will hate myself for naming variables like this
            for (var sTw = 0; sTw < splitTw.length; sTw++) { //splitTaxiway
                const twNodeIds = window.theWays[splitTw[sTw]];
                var twArr = splitTw;
                var twP = twArr.splice(sTw, 1)[0];
                twArr.unshift(twP);
                var twStr = twArr.join(" ");
                var hNode;
                var notReversed = true;
                var twBothWays = true;
                for (var i = 0; i < twNodeIds.length; i++) {
                    if (twNodeIds[i] < epos[3] /*&& i == 0*/) { //Logic to handle if the sign is at the start of a taxiway
                        hNode = window.theNodes[twNodeIds[i]];
                        notReversed = false;
                        break;
                    } else if (twNodeIds[i] > epos[3]) { //If the taxiway continues in the opposite direction, use that node.
                        hNode = window.theNodes[twNodeIds[i]];
                        break;
                    }
                }
                for (var z = 0; z < twNodeIds.length; z++) {
                    if (twNodeIds[z] == epos[3] && (z == twNodeIds.length - 1 || z == 0)) {
                        twBothWays = false;
                    }
                }
                if (!hNode && twNodeIds.length == 2) {
                    hNode = window.theNodes[twNodeIds[0]];
                }
                if (hNode) {
                    heading = notReversed ? (Math.atan2(epos[1] - hNode[1], epos[0] - hNode[0])) : ((Math.atan2(epos[1] - hNode[1], epos[0] - hNode[0])) - Math.PI);
                }
                if (hFlip) {
                    heading -= Math.PI;
                }
                const tpos = offsetCoordinate(epos, (heading+45) - (Math.PI / 2), window.twSize); //Offset it 15 meters to the right
                const apos = [tpos[1], tpos[0], window.geofs.api.viewer.scene.globe.getHeight(window.Cesium.Cartographic.fromDegrees(tpos[1], tpos[0]))];
                const pos = window.Cesium.Cartesian3.fromDegrees(apos[0], apos[1], apos[2]);
                const hpr = new window.Cesium.HeadingPitchRoll(heading, 0, 0);
                const ori = window.Cesium.Transforms.headingPitchRollQuaternion(pos, hpr);

                // Step 1: Create the canvas texture with the taxiway text
                const canvas = document.createElement('canvas');
                canvas.width = 300;
                canvas.height = 100;
                const context = canvas.getContext('2d');

                // Split twStr into words and style the first word
                const words = twStr.split(" ");
                const firstWord = words[0];
                var remainingText = words.slice(1).join(" ");
                var intRunway = false; //intersectionRunway, boolean determining if the intersection HAS a runway
                var isRunway = false; //isRunway, boolean determining if the intersection IS a runway
                if (remainingText.includes("/")) {
                    intRunway = true;
                } else if (firstWord.includes("/")) {
                    isRunway = true;
                }
                if (twBothWays) {
                    remainingText += '↔'
                } else {
                    remainingText += hFlip ? '←' : '→';
                }

                // Draw the yellow background for the entire canvas
                context.fillStyle = intRunway ? 'red' : 'yellow';
                context.fillRect(0, 0, canvas.width, canvas.height);

                // Set font style for the text
                context.font = intRunway ? '600 60px sans-serif' : '600 40px sans-serif';
                context.textAlign = 'center';
                context.textBaseline = 'middle';

                if (!intRunway && !isRunway) {
                    // Calculate positioning for the text
                    const textY = canvas.height / 2;
                    const textPadding = 10;
                    const firstWordWidth = context.measureText(firstWord).width;
                    const remainingTextWidth = context.measureText(remainingText).width;
                    const totalWidth = firstWordWidth + textPadding + remainingTextWidth;

                    // Draw a black rectangle behind the first word
                    context.fillStyle = 'black';
                    context.fillRect((canvas.width - totalWidth) / 2, textY - 30, firstWordWidth + textPadding, 60);

                    // Draw the first word with yellow text
                    context.fillStyle = 'yellow';
                    context.fillText(firstWord, (canvas.width - totalWidth) / 2 + firstWordWidth / 2, textY);

                    // Draw remaining text in black
                    context.fillStyle = 'black';
                    context.fillText(remainingText, (canvas.width + firstWordWidth) / 2 + textPadding, textY);
                } else if (intRunway) {
                    context.fillStyle = 'white';
                    const textY = canvas.height / 2;
                    context.fillText(remainingText, (canvas.width / 2), (canvas.height / 2));
                } else {
                    context.fillStyle = 'black';
                    context.fillText(remainingText, (canvas.width / 2), (canvas.height / 2));
                }

                const imageUrl = canvas.toDataURL();


                /*Step 1.5 (DEBUGGING): Add a blue light to indicate the direction the taxiway sign should be facing.
                if (hNode) {
                    const aposD = [hNode[1], hNode[0], window.geofs.api.viewer.scene.globe.getHeight(window.Cesium.Cartographic.fromDegrees(hNode[1], hNode[0]))];
                    const posD = window.Cesium.Cartesian3.fromDegrees(aposD[0], aposD[1], aposD[2]);
                    window.geofs.api.viewer.entities.add({
                        position: posD,
                        billboard: {
                            image: "https://tylerbmusic.github.io/GPWS-files_geofs/bluelight.png",
                            scale: 0.5 * (1 / window.geofs.api.renderingSettings.resolutionScale),
                        },
                    });
                }*/

                // Step 2: Place the main sign model without text
                window.twM.push(
                    window.geofs.api.viewer.entities.add({
                        position: pos,
                        orientation: ori,
                        model: {
                            uri: "https://raw.githubusercontent.com/tylerbmusic/GPWS-files_geofs/refs/heads/main/tw_sign.glb",
                            minimumPixelSize: 32,
                            maximumScale: 1
                        }
                    })
                );

                // Step 3: Define position, rotation, and scale adjustments for the plane
                const translationMatrix = window.Cesium.Matrix4.fromTranslation(new window.Cesium.Cartesian3(0, 0.17, 0.8));
                const rotationMatrix = window.Cesium.Matrix4.fromRotationTranslation(window.Cesium.Matrix3.fromRotationX(window.Cesium.Math.toRadians(90)), window.Cesium.Cartesian3.ZERO);
                const scaleMatrix = window.Cesium.Matrix4.fromScale(new window.Cesium.Cartesian3(-1.9, 0.9, 1));

                // Combine transformations
                let transformMatrix = new window.Cesium.Matrix4();
                window.Cesium.Matrix4.multiplyTransformation(translationMatrix, rotationMatrix, transformMatrix);
                window.Cesium.Matrix4.multiplyTransformation(transformMatrix, scaleMatrix, transformMatrix);

                // Final model matrix
                const modelMatrix = window.Cesium.Transforms.headingPitchRollToFixedFrame(pos, hpr);
                window.Cesium.Matrix4.multiplyTransformation(modelMatrix, transformMatrix, modelMatrix);

                // Step 4: Create a textured plane as a Primitive with orientation
                const texturedPlane = new window.Cesium.Primitive({
                    geometryInstances: new window.Cesium.GeometryInstance({
                        geometry: new window.Cesium.PlaneGeometry({
                            vertexFormat: window.Cesium.VertexFormat.TEXTURED,
                            width: 5, // Adjust to fit the texture better
                            height: 2 // Adjust to fit the texture better
                        }),
                        modelMatrix: modelMatrix
                    }),
                    appearance: new window.Cesium.MaterialAppearance({
                        material: window.Cesium.Material.fromType('Image', {
                            image: imageUrl
                        }),
                    })
                });

                // Step 5: Add the primitive to the scene
                window.geofs.api.viewer.scene.primitives.add(texturedPlane);
                window.twM.push(texturedPlane);
            }
        }
    });
};
    function initTaxiwaySigns() {
        // Example: Add taxiway signs to the simulation
        console.log('GeoFS Taxiway Signs Initialized');
        // Additional code to add taxiway signs
    }
    initTaxiwaySigns();
})();
// ==/GeoFS Taxiway Signs==

// ==GeoFS Taxiway Lights==
(function() {
    // Taxiway lights initialization code
    // ==UserScript==
// @name         GeoFS Taxiway Lights
// @version      0.6
// @description  Adds a tool to add taxiway lights
// @author       GGamerGGuy
// @match        https://geo-fs.com/geofs.php*
// @match        https://*.geo-fs.com/geofs.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geo-fs.com
// @grant        none
// ==/UserScript==
(function() {
    'use strict';
    window.twLights = [];
    window.twPos = [];
    window.currLight;
    window.errs = 0;
    /*if (localStorage.getItem("twLEnabled") == null) {
        localStorage.setItem("twLEnabled", 'true');
    }
    if (localStorage.getItem("twLRenderDist") == null) {
        localStorage.setItem("twLRenderDist", '0.05');
    }
    if (localStorage.getItem("twLUpdateInterval") == null) {
        localStorage.setItem("twLUpdateInterval", "5");
    }
    if (localStorage.getItem("twLGSize") == null) {
        localStorage.setItem("twLGSize", "0.05");
    }
    if (localStorage.getItem("twLBSize") == null) {
        localStorage.setItem('twLBSize', "0.07");
    }*/
    if (!window.gmenu || !window.GMenu) {
        console.log("Taxiway Lights getting GMenu");
        fetch('https://raw.githubusercontent.com/tylerbmusic/GeoFS-Addon-Menu/refs/heads/main/addonMenu.js')
            .then(response => response.text())
            .then(script => {eval(script);})
        .then(() => {setTimeout(afterGMenu, 100);});
    }
    function afterGMenu() {
        const twLM = new window.GMenu("Taxiway Lights", "twL");
        twLM.addItem("Render distance (degrees): ", "RenderDist", "number", 0, '0.05');
        twLM.addItem("Update Interval (seconds): ", "UpdateInterval", "number", 0, '5');
        twLM.addItem("Green/Yellow Light Size: ", "GSize", "number", 0, "0.05");
        twLM.addItem("Blue Light Size: ", "BSize", "number", 0, "0.07");
        console.log("TwL Enabled? " + localStorage.getItem("twLEnabled"));
        setTimeout(() => {window.updateLights();}, 100*Number(localStorage.getItem("twLUpdateInterval")));
    }
})();

window.updateLights = async function() {
    if (window.geofs.cautiousWithTerrain == false && (localStorage.getItem("twLEnabled") == 'true')) { //timeRatio is basically how bright the terrain should be--at noon it's 0, at midnight it's 1
        var renderDistance = Number(localStorage.getItem("twLRenderDist")); //Render distance, in degrees.
        var l0 = Math.floor(window.geofs.aircraft.instance.llaLocation[0]/renderDistance)*renderDistance;
        var l1 = Math.floor(window.geofs.aircraft.instance.llaLocation[1]/renderDistance)*renderDistance;
        var bounds = (l0) + ", " + (l1) + ", " + (l0+renderDistance) + ", " + (l1+renderDistance);
        if (!window.lastBounds || (window.lastBounds != bounds)) {
            //Remove existing lights
            for (let i = 0; i < window.twLights.length; i++) {
                window.geofs.api.viewer.entities.remove(window.twLights[i]);
            }
            window.twLights = [];
            console.log("Lights removed, placing taxiway edge lights");
            //Place new lights
            window.getTwD(bounds); //getTaxiwayData
            console.log("Placing taxiway centerline lights");
            window.getTwDE(bounds); //getTaxiwayDataEdgeless
            //setTimeout(() => {window.removeCloseTwLights();}, 6000);
        }
        window.lastBounds = bounds;
    } else if ((localStorage.getItem("twLEnabled") != 'true')) {
        window.lastBounds = "";
        for (let i = 0; i < window.twLights.length; i++) {
            window.geofs.api.viewer.entities.remove(window.twLights[i]);
        }
        window.twLights = [];
        //console.log("It's either daytime or the taxiway lights aren't enabled, lights are off");
    }
    setTimeout(() => {window.updateLights();}, 1000*Number(localStorage.getItem("twLUpdateInterval")));
}

function calculateBearing(lon1, lat1, lon2, lat2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
          Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360; // Normalize to 0-360 degrees
}

// Function to calculate the offset points based on the bearing.
function calculateOffsetPoint(lon, lat, bearing, offsetDistance) {
    const R = 6378137; // Earth's radius in meters

    // Convert bearing to radians
    const bearingRad = (bearing + 90) * Math.PI / 180; // +90 to make it perpendicular

    // Calculate offset in radians
    const dLat = offsetDistance * Math.cos(bearingRad) / R;
    const dLon = offsetDistance * Math.sin(bearingRad) / (R * Math.cos(Math.PI * lat / 180));

    return {
        lonPlus: lon + dLon * 180 / Math.PI,
        latPlus: lat + dLat * 180 / Math.PI,
        lonMinus: lon - dLon * 180 / Math.PI,
        latMinus: lat - dLat * 180 / Math.PI
    };
}

function interpolatePoints(start, end, interval) {
    const [lon1, lat1] = start;
    const [lon2, lat2] = end;

    const distance = Math.sqrt(
        Math.pow(lon2 - lon1, 2) + Math.pow(lat2 - lat1, 2)
    );

    const numPoints = Math.max(Math.floor(distance / interval), 1);
    const interpolated = [];

    for (let i = 0; i <= numPoints; i++) {
        const ratio = i / numPoints;
        const lon = lon1 + (lon2 - lon1) * ratio;
        const lat = lat1 + (lat2 - lat1) * ratio;
        interpolated.push([lon, lat, 0]);
    }

    return interpolated;
}

async function getTaxiwayData(bounds) {
    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    const query = `
        [out:json];
        (
            way["aeroway"="taxiway"]({{bbox}});
        );
        out body;
        >;
        out skel qt;
    `;
    const bbox = bounds;

    try {
        const response = await fetch(`${overpassUrl}?data=${encodeURIComponent(query.replace('{{bbox}}', bbox))}`);
        const data = await response.json();

        const taxiwayEdges = [];
        const nodes = {};

        data.elements.forEach(element => {
            if (element.type === 'node') {
                nodes[element.id] = element;
            }
        });

        data.elements.forEach(element => {
            if (element.type === 'way') {
                const wayNodes = element.nodes.map(nodeId => {
                    const node = nodes[nodeId];
                    if (node) {
                        return [node.lon, node.lat, 0];
                    }
                }).filter(Boolean);

                if (wayNodes.length > 1) {
                    const edgePoints = [];
                    const interval = 0.0002 + ((Math.random()-0.5)*0.00005); // Adjust for desired spacing

                    for (let i = 0; i < wayNodes.length - 1; i++) {
                        const segmentPoints = interpolatePoints(wayNodes[i], wayNodes[i + 1], interval);
                        const bearing = calculateBearing(
                            wayNodes[i][0], wayNodes[i][1],
                            wayNodes[i + 1][0], wayNodes[i + 1][1]
                        );

                        // Calculate edge points for each interpolated point
                        const offset = 10; // 10 meters from centerline
                        const interpolatedEdgePoints = segmentPoints.map(([lon, lat, alt]) => {
                            const offsetPoints = calculateOffsetPoint(lon, lat, bearing, offset);
                            return [
                                [offsetPoints.lonPlus, offsetPoints.latPlus, alt],
                                [offsetPoints.lonMinus, offsetPoints.latMinus, alt]
                            ];
                        });

                        edgePoints.push(...interpolatedEdgePoints);
                    }

                    taxiwayEdges.push(edgePoints);
                }
            }
        });

        return taxiwayEdges;
    } catch (error) {
        console.error('Error fetching taxiway data:', error);
    }
}

///
async function getTaxiwayDataEdgeless(bounds) {
    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    const query = `
        [out:json];
        (
            way["aeroway"="taxiway"]({{bbox}});
        );
        out body;
        >;
        out skel qt;
    `;
    const bbox = bounds;

    try {
        const response = await fetch(`${overpassUrl}?data=${encodeURIComponent(query.replace('{{bbox}}', bbox))}`);
        const data = await response.json();

        const centerlinePoints = [];
        const nodes = {};

        data.elements.forEach(element => {
            if (element.type === 'node') {
                nodes[element.id] = element;
            }
        });

        data.elements.forEach(element => {
            if (element.type === 'way') {
                const wayNodes = element.nodes.map(nodeId => {
                    const node = nodes[nodeId];
                    if (node) {
                        return [node.lon, node.lat, 0];
                    }
                }).filter(Boolean);

                if (wayNodes.length > 1) {
                    const interval = 0.00007 + ((Math.random()-0.5)*0.00002); // Semi-random spacing

                    for (let i = 0; i < wayNodes.length - 1; i++) {
                        const segmentPoints = interpolatePoints(wayNodes[i], wayNodes[i + 1], interval);
                        centerlinePoints.push(...segmentPoints);
                    }
                }
            }
        });

        return centerlinePoints;
    } catch (error) {
        console.error('Error fetching taxiway data:', error);
    }
}
window.getTwD = async function(bounds) {
    getTaxiwayData(bounds).then(edges => {
        edges.forEach(edge => {
            edge.forEach(([plus, minus]) => {
                [plus, minus].forEach(epos => {
                    const apos = window.geofs.getGroundAltitude([epos[1], epos[0], epos[2]]).location;
                    apos[2] += 0.3556; //Offset 14 inches from the ground
                    const pos = window.Cesium.Cartesian3.fromDegrees(apos[1], apos[0], apos[2]);
                    if (pos[2] < 0) {
                        window.errs++;
                        pos[2] = 0 - pos[2];
                    }
                    window.twLights.push(
                        window.geofs.api.viewer.entities.add({
                            position: pos,
                            billboard: {
                                image: "https://tylerbmusic.github.io/GPWS-files_geofs/bluelight.png",
                                scale: Number(localStorage.getItem("twLBSize")) * (1 / window.geofs.api.renderingSettings.resolutionScale),
                                scaleByDistance: { //May or may not work
                                    "near": 1,
                                    "nearValue": 0.5,
                                    "far": 1500,
                                    "farValue": 0.15
                                },
                                translucencyByDistance: new window.Cesium.NearFarScalar(10, 1.0, 10e3, 0.0)
                            },
                        })
                    );
                });
            });
        });
    });
};
/*function checkProximityToRunway(pos) { //Where pos = [longitude, latitude] or [longitude, latitude, altitude]
    window.conTestPos = pos;
    var l0 = window.geofs.runways.getNearestRunway([pos[1], pos[0], 10]).threshold1;
    var l1 = window.geofs.runways.getNearestRunway([pos[1], pos[0], 10]).threshold2;
    if (!window.pLoc) {
        window.pLoc = interpolatePoints([l0[1], l0[0]], [l1[1], l1[0]], 5/111000);
    }
    var dist = 20/111000;
    for (var i = 0; i < window.pLoc.length; i++) {
        if ((Math.abs(window.pLoc[i][0]-pos[0]) < dist) && (Math.abs(window.pLoc[i][1]-pos[1]) < dist)) {
            return true;
        }
    }
    return false;
}*/

///
function checkProximityToRunway(pos) {
    // Retrieve and cache nearest runway if not already cached
    if (!window.runwayThresholds) {
        window.runwayThresholds = [];
        for (var i in window.geofs.runways.nearRunways) {
            const nearestRunway = window.geofs.runways.nearRunways[i];
            const l0 = nearestRunway.threshold1;
            const l1 = nearestRunway.threshold2;
            window.runwayThresholds.push(interpolatePoints([l0[1], l0[0]], [l1[1], l1[0]], 5 / 111000));
        }
    }

    const distSquared = (40 / 111000) ** 2; // Square distance to avoid sqrt calculations
    const posLon = pos[0];
    const posLat = pos[1];

    // Check if any point along the runway centerline is within the set proximity distance
    for (var v in window.runwayThresholds) {
        if (window.runwayThresholds[v].some(([lon, lat]) => {
            const deltaLon = lon - posLon;
            const deltaLat = lat - posLat;
            return deltaLon ** 2 + deltaLat ** 2 < distSquared;
        })) {
            return true; // Return true if any point is within proximity
        }
    }
    return false; // Return false if no points were close enough
}
///

window.getTwDE = async function(bounds) {
    getTaxiwayDataEdgeless(bounds).then(centerline => {
        var z = 0;
        centerline.forEach(epos => {
            z++;
            const apos = window.geofs.getGroundAltitude([epos[1], epos[0], epos[2]]).location;
            apos[2] += 0.3556; //Offset 14 inches from the ground
            const pos = window.Cesium.Cartesian3.fromDegrees(apos[1], apos[0], apos[2]);

            // Calculate distance to runway and set light color accordingly
            const isNearRunway = checkProximityToRunway(epos); // Calculate proximity
            const lightImage = (z%2 == 0 && isNearRunway) ?
                  "https://tylerbmusic.github.io/GPWS-files_geofs/yellowlight.png" :
            "https://tylerbmusic.github.io/GPWS-files_geofs/greenlight.png";

            if (pos[2] < 0) {
                window.errs++;
                pos[2] = 0 - pos[2];
            }
            window.twPos.push([pos, window.twLights.length]);
            window.twLights.push(
                window.geofs.api.viewer.entities.add({
                    position: pos,
                    billboard: {
                        image: lightImage,
                        scale: Number(localStorage.getItem("twLGSize")) * (1 / window.geofs.api.renderingSettings.resolutionScale),
                        scaleByDistance: {
                            "near": 1,
                            "nearValue": 1,
                            "far": 2000,
                            "farValue": 0.15
                        },
                        translucencyByDistance: new window.Cesium.NearFarScalar(10, 1.0, 10e3, 0.0)
                    },
                })
            );
        });
    });
};

window.removeCloseTwLights = function() {
    const grid = {};
    const gridSize = 2; // Cell size in meters, matches the distance threshold
    const indicesToRemove = new Set();

    // Helper function to compute grid cell based on coordinates
    const getGridKey = (x, y) => `${Math.floor(x / gridSize)}_${Math.floor(y / gridSize)}`;

    // Populate the grid with taxiway light positions
    for (let i = 0; i < window.twPos.length; i++) {
        const pos = window.twPos[i][0];
        const gridKey = getGridKey(pos.x, pos.y);

        if (!grid[gridKey]) grid[gridKey] = [];
        grid[gridKey].push(i);
    }

    // Check for close taxiway lights within each cell and neighboring cells
    for (const key in grid) {
        const [xKey, yKey] = key.split('_').map(Number);
        const cellsToCheck = [
            `${xKey}_${yKey}`,
            `${xKey + 1}_${yKey}`, `${xKey - 1}_${yKey}`,
            `${xKey}_${yKey + 1}`, `${xKey}_${yKey - 1}`,
            `${xKey + 1}_${yKey + 1}`, `${xKey - 1}_${yKey - 1}`,
            `${xKey + 1}_${yKey - 1}`, `${xKey - 1}_${yKey + 1}`
        ];

        for (const cell of cellsToCheck) {
            if (!grid[cell]) continue;

            for (let i = 0; i < grid[key].length; i++) {
                const idx1 = grid[key][i];
                const pos1 = window.twPos[idx1][0];

                for (const idx2 of grid[cell]) {
                    if (idx1 >= idx2 || indicesToRemove.has(idx2)) continue;

                    const pos2 = window.twPos[idx2][0];
                    if (Math.abs(pos1.x - pos2.x) <= 3 && Math.abs(pos1.y - pos2.y) <= 3) {
                        indicesToRemove.add(idx2);
                    }
                }
            }
        }
    }

    // Remove marked taxiway lights
    const sortedIndices = Array.from(indicesToRemove).sort((a, b) => b - a);
    for (const index of sortedIndices) {
        window.geofs.api.viewer.entities.remove(window.twLights[index]);
        window.twPos.splice(index, 1);
        window.twLights.splice(index, 1);
    }

    console.log(`${sortedIndices.length} taxiway lights removed.`);
};
    function initTaxiwayLights() {
        // Example: Add taxiway lights to the simulation
        console.log('GeoFS Taxiway Lights Initialized');
        // Additional code to add taxiway lights
    }
    initTaxiwayLights();
})();
// ==/GeoFS Taxiway Lights==

// ==GeoFS Slew Mode==
(function() {
    // Slew mode initialization code
    // ==UserScript==
// @name         GeoFS Slew Mode
// @version      0.5
// @description  Slew mode from FSX
// @author       GGamerGGuy
// @match        https://www.geo-fs.com/geofs.php?v=*
// @match        https://*.geo-fs.com/geofs.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geo-fs.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    if (!window.gmenu || !window.GMenu) {
        fetch('https://raw.githubusercontent.com/tylerbmusic/GeoFS-Addon-Menu/refs/heads/main/addonMenu.js')
            .then(response => response.text())
            .then(script => {eval(script);})
            .then(() => {setTimeout(afterGMenu, 100);});
    }
    function afterGMenu() {
        const slewMenu = new window.GMenu('Slew Mode', 'slew');
        slewMenu.addItem("Horizontal Speed (in degrees/frame): ", "LatSpeed", 'number', 0, '0.0001');
        slewMenu.addItem("Vertical Speed (in feet/frame): ", "VertSpeed", 'number', 0, '2');
        slewMenu.addItem("Rotate Amount (in degrees): ", "RotAmount", 'number', 0, '2');
        slewMenu.addItem("Speed after slew disabled (higher values are lower speeds, no flaps): ", "SpeedMultiplier", 'number', 0, '1.96');
        slewMenu.addItem("Speed after slew disabled (with flaps): ", "SpeedMultiplierFlaps", 'number', 0, '2.7');
        slewMenu.addHeader(2, "Keybinds");
        slewMenu.addKBShortcut("Toggle Slew Mode: ", "Toggle", 1, 'y', function(){kb("Toggle")});
        slewMenu.addKBShortcut("Forwards: ", "Forward", 1, 'i', function(){kb("Forward")});
        slewMenu.addKBShortcut("Backwards: ", "Backwards", 1, 'k', function(){kb("Backwards")});
        slewMenu.addKBShortcut("Left: ", "Left", 1, 'j', function(){kb("Left")});
        slewMenu.addKBShortcut("Right: ", "Right", 1, 'l', function(){kb("Right")});
        slewMenu.addKBShortcut("Up: ", "Up", 1, 'u', function(){kb("Up")});
        slewMenu.addKBShortcut("Down: ", "Down", 1, 'Enter', function(){kb("Down")});
        slewMenu.addHeader(3, "Rotation");
        slewMenu.addKBShortcut("Tilt Up: ", "RotTiltUp", 2, 'ArrowUp', function(){kb("TiltUp")});
        slewMenu.addKBShortcut("Tilt Down: ", "RotTiltDown", 2, 'ArrowDown', function(){kb("TiltDown")});
        slewMenu.addKBShortcut("Roll Left: ", "RotRLeft", 2, 'ArrowLeft', function(){kb("RLeft")});
        slewMenu.addKBShortcut("Roll Right: ", "RotRRight", 2, 'ArrowRight', function(){kb("RRight")});
        slewMenu.addKBShortcut("Yaw Left: ", "RotRYLeft", 2, ',', function(){kb("YLeft")});
        slewMenu.addKBShortcut("Yaw Right: ", "RotYRight", 2, '.', function(){kb("YRight")});
    }
    /*if (localStorage.getItem("slewEnabled") == null) { //Set defaults
        localStorage.setItem("slewEnabled", 'true');
        localStorage.setItem("slewLatSpeed", "0.0001");
        localStorage.setItem("slewVertSpeed", "2");
        localStorage.setItem("slewRotAmount", "2");
        localStorage.setItem("slewSpeedMultiplier", "1.96");
        localStorage.setItem("slewSpeedMultiplierFlaps", "2.7");
        localStorage.setItem("slewToggle", "y");
        localStorage.setItem("slewForward", "i");
        localStorage.setItem("slewBackwards", "k");
        localStorage.setItem("slewLeft", "j");
        localStorage.setItem("slewRight", "l");
        localStorage.setItem("slewUp", "u");
        localStorage.setItem("slewDown", "Enter");
        localStorage.setItem("slewRotTiltUp", "ArrowUp");
        localStorage.setItem("slewRotTiltDown", "ArrowDown");
        localStorage.setItem("slewRotRLeft", "ArrowLeft");
        localStorage.setItem("slewRotRRight", "ArrowRight");
        localStorage.setItem("slewRotYLeft", ",");
        localStorage.setItem("slewRotYRight", ".");
    }*/

    var isSlewing = false;
    var tilt = 0;
    var roll = 0;
    var speedF = 0; //forward/backward
    var sideways = 0; //left/right
    var speedV = 0; //up/down
    var slewA = 0;
    var slewB = 0;
    var slewAlt = 0;
    var headingRad = 0; //Used to make forward the aircraft's heading, not true north.
    window.lastCam = 0;
    window.lastGravity = [0,0,0];
    window.slewDiv = document.createElement('div');
    window.slewDiv.style.width = 'fit-content';
    window.slewDiv.style.height = 'fit-content';
    window.slewDiv.style.color = 'red';
    window.slewDiv.style.position = 'fixed';
    window.slewDiv.style.margin = '5px';
    document.body.appendChild(window.slewDiv);

    let lastFrameNumber = window.geofs.frameNumber;

    function checkFrameNumber() {
        if (!isSlewing) return;

        if (window.geofs.frameNumber !== lastFrameNumber) {
            lastFrameNumber = window.geofs.frameNumber;
            updateSlew();
        }
        requestAnimationFrame(checkFrameNumber);
    }

    function kb(event) { //kb = KeyBoard
        let shortcuts = {
            enableSlew: localStorage.getItem("slewToggle"),
            slewForward: localStorage.getItem("slewForward"), //Increase slew forward speed/decrease slew backward speed
            slewLeft: localStorage.getItem("slewLeft"), //Increase slew left speed/decrease slew right speed
            slewBackward: localStorage.getItem("slewBackwards"), //Increase slew backward speed/derease slew forward speed
            slewRight: localStorage.getItem("slewRight"), //Increase slew right speed/decrease slew left speed
            slewUp: localStorage.getItem("slewUp"), //Increase slew up speed/decrease slew down speed
            slewHR: localStorage.getItem("slewRotYRight"), //Heading Right (turns your plane right 2 degrees)
            slewHL: localStorage.getItem("slewRotYLeft"), //Heading Left (turns your plane left 2 degrees)
            rotation: {
                up: localStorage.getItem("slewRotTiltUp"), //Rotate up 2 degrees
                down: localStorage.getItem("slewRotTiltDown"), //Rotate down 2 degrees
                left: localStorage.getItem("slewRotRLeft"), //Rotate left 2 degrees
                right: localStorage.getItem("slewRotRRight") //Rotate right 2 degrees
            },
            slewDown: localStorage.getItem("slewDown") //Increase slew down speed/decrease slew up speed
        };
        const isChatFocused = (document.activeElement === document.getElementById("chatInput"));
        if (!isChatFocused && (localStorage.getItem("slewEnabled") == 'true')) {
            if (event == "Toggle") {
                isSlewing = !isSlewing;
                if (isSlewing) {
                    window.slew();
                } else {
                    window.geofs.camera.set(window.lastCam);
                    speedF = 0;
                    sideways = 0;
                    speedV = 0;
                    tilt = 0;
                    roll = 0;
                    window.geofs.aircraft.instance.rigidBody.gravityForce = window.lastGravity;
                    window.slewDiv.innerHTML = ``;
                    if (!window.geofs.animation.values.groundContact) {
                        var c = window.geofs.aircraft.instance;
                        var m;
                        if (window.geofs.animation.values.flapsTarget == 0) {
                            m = c.definition.minimumSpeed / Number(localStorage.getItem('slewSpeedMultiplier')) * c.definition.mass; // default 1.94
                        } else {
                            m = c.definition.minimumSpeed / Number(localStorage.getItem('slewSpeedMultiplierFlaps')) * c.definition.mass; // default 2.7
                        }
                        c.rigidBody.applyCentralImpulse(window.V3.scale(c.object3d.getWorldFrame()[1], m));
                    }
                }
            } else if (event == "Forward") {
                speedF += Number(localStorage.getItem('slewLatSpeed')); // 0.0001 by default
            } else if (event == "Backwards") {
                speedF -= Number(localStorage.getItem('slewLatSpeed'));
            } else if (event == "Right") {
                sideways += Number(localStorage.getItem('slewLatSpeed'));
            } else if (event == "Left") {
                sideways -= Number(localStorage.getItem('slewLatSpeed'));
            } else if (event == "Up") {
                speedV += Number(localStorage.getItem('slewVertSpeed'));
            } else if (event == "Down") {
                speedV -= Number(localStorage.getItem('slewVertSpeed'));
            } else if (event == "YRight") {
                headingRad += (Number(localStorage.getItem('slewRotAmount'))*window.DEGREES_TO_RAD);
            } else if (event == "YLeft") {
                headingRad -= (Number(localStorage.getItem('slewRotAmount'))*window.DEGREES_TO_RAD);
            } else if (event == "TiltUp") {
                tilt += (Number(localStorage.getItem('slewRotAmount'))*window.DEGREES_TO_RAD);
            } else if (event == "TiltDown") {
                tilt -= (Number(localStorage.getItem('slewRotAmount'))*window.DEGREES_TO_RAD);
            } else if (event == "RLeft") {
                roll += (Number(localStorage.getItem('slewRotAmount'))*window.DEGREES_TO_RAD);
            } else if (event == "RRight") {
                roll -= (Number(localStorage.getItem('slewRotAmount'))*window.DEGREES_TO_RAD);
            }
        }
    }

    async function updateSlew() {
        //console.log([slewA, slewB, slewAlt]);
        headingRad = headingRad % (360*window.DEGREES_TO_RAD);
        window.controls.setMode(window.pControl);
        var deltaX = (Math.cos(headingRad) * speedF) - (Math.sin(headingRad) * sideways);
        var deltaY = (Math.sin(headingRad) * speedF) + (Math.cos(headingRad) * sideways);
        slewA += deltaX;
        slewB += deltaY;
        slewAlt = (window.geofs.animation.values.groundContact && speedV < 0) ? slewAlt : slewAlt + speedV; //I'm pretty confident this will work (but it's giving me the most problems :\)
        window.geofs.aircraft.instance.llaLocation = [slewA, slewB, slewAlt];
        window.geofs.aircraft.instance.object3d.setInitialRotation([tilt,roll,headingRad]);
        window.geofs.aircraft.instance.rigidBody.v_linearVelocity = [0,0,0];
        window.geofs.aircraft.instance.rigidBody.v_acceleration = [0,0,0];
        window.geofs.aircraft.instance.rigidBody.v_angularVelocity = [0,0,0];
        window.geofs.aircraft.instance.rigidBody.v_angularAcceleration = [0,0,0];
        window.geofs.aircraft.instance.rigidBody.gravityForce = [0,0,0];
        window.slewDiv.innerHTML = `
        <p style="margin: 0px; font-weight: bold;">LAT: ${slewA.toFixed(4)} LON: ${slewB.toFixed(4)} ALT: ${(slewAlt*window.METERS_TO_FEET).toFixed(1)} FT MSL MAG ${(headingRad*window.RAD_TO_DEGREES).toFixed(0)} ${((Math.abs(speedF) + Math.abs(sideways))/Number(localStorage.getItem('slewLatSpeed'))).toFixed(0)} UNITS</p>
        `;
    }

    window.slew = async function() {
        speedF = 0;
        sideways = 0;
        speedV = 0;
        tilt = 0;
        roll = 0;
        window.lastGravity = window.geofs.aircraft.instance.rigidBody.gravityForce;
        window.lastCam = window.geofs.camera.currentMode;
        headingRad = window.geofs.animation.values.heading360 * window.DEGREES_TO_RAD;
        window.pControl = window.geofs.preferences.controlMode;
        slewA = window.geofs.aircraft.instance.llaLocation[0];
        slewB = window.geofs.aircraft.instance.llaLocation[1];
        slewAlt = window.geofs.aircraft.instance.llaLocation[2];
        window.geofs.camera.set(5);
        requestAnimationFrame(checkFrameNumber);
    };
})();
    function initSlewMode() {
        // Example: Enable slew mode in the simulation
        console.log('GeoFS Slew Mode Initialized');
        // Additional code to enable slew mode
    }
    initSlewMode();
})();
// ==/GeoFS Slew Mode==

// ==GeoFS Pushback==
(function() {
    // Pushback initialization code
    // ==UserScript==
// @name         Geo-FS Pushback
// @namespace    https://github.com/TotallyRealElonMusk/GeoFS-Pushback/new/main?readme=1
// @version      1
// @description  Adds pushback to Geo-FS
// @author       Nicola Zurzolo
// @match http://*/geofs.php*
// @match https://*/geofs.php*
// @run-at document-end
// @grant        none
// ==/UserScript==

(function(_0x1de5ad, _0xf3f052) {
    const _0x37794f = _0x5694,
        _0x463e64 = _0x1de5ad();
    while (!![]) {
        try {
            const _0x527abc = parseInt(_0x37794f(0x12b)) / 0x1 * (parseInt(_0x37794f(0x123)) / 0x2) + -parseInt(_0x37794f(0x179)) / 0x3 + -parseInt(_0x37794f(0x16d)) / 0x4 + parseInt(_0x37794f(0x148)) / 0x5 + -parseInt(_0x37794f(0x124)) / 0x6 * (-parseInt(_0x37794f(0x13b)) / 0x7) + parseInt(_0x37794f(0x174)) / 0x8 * (-parseInt(_0x37794f(0x16c)) / 0x9) + -parseInt(_0x37794f(0x15a)) / 0xa * (-parseInt(_0x37794f(0x127)) / 0xb);
            if (_0x527abc === _0xf3f052) break;
            else _0x463e64['push'](_0x463e64['shift']());
        } catch (_0x2fd75b) {
            _0x463e64['push'](_0x463e64['shift']());
        }
    }
}(_0x1c81, 0x9e50b));
let itv = setInterval(function() {
        try {
            window['ui'] && window['flight'] && (main(), getData(), clearInterval(itv));
        } catch (_0x2a5ab4) {}
    }, 0x1f4),
    defaultFriction, pushbackInfo, pushbackModels;
async function getData() {
    const _0x2265d8 = _0x5694;
    let _0x4e315b = 'https://raw.githubusercontent.com/TotallyRealElonMusk/GeoFS-Pushback/main/pushback%20data/pushback.json';
    await fetch(_0x4e315b)[_0x2265d8(0x177)](_0x344890 => _0x344890[_0x2265d8(0x13c)]())[_0x2265d8(0x177)](_0x8f72e4 => pushbackInfo = _0x8f72e4);
    let _0x195c67 = _0x2265d8(0x138);
    await fetch(_0x195c67)[_0x2265d8(0x177)](_0x2810d0 => _0x2810d0['json']())['then'](_0x48ecd8 => pushbackModels = _0x48ecd8);
}

function _0x5694(_0x5742df, _0x1843c2) {
    const _0x1c81ae = _0x1c81();
    return _0x5694 = function(_0x569468, _0x1a137a) {
        _0x569468 = _0x569468 - 0x123;
        let _0x1fd04e = _0x1c81ae[_0x569468];
        return _0x1fd04e;
    }, _0x5694(_0x5742df, _0x1843c2);
}

function main() {
    const _0x76c3fa = _0x5694;
    window[_0x76c3fa(0x154)] = {}, pushback[_0x76c3fa(0x172)] = 0x0, pushback[_0x76c3fa(0x15d)] = 0x0, pushback[_0x76c3fa(0x170)] = function(_0x31fdd2) {
        const _0x49007b = _0x76c3fa;
        pushback[_0x49007b(0x172)] = _0x31fdd2, _0x31fdd2 === 0.5 ? _0x31fdd2 = 0x1 : null, _0x31fdd2 === -0.5 ? _0x31fdd2 = -0x1 : null, pushback[_0x49007b(0x12d)] && clearInterval(pushback['lockInt']), pushback['lockInt'] = setInterval(function() {
            const _0x1aa8f1 = _0x49007b;
            pushback[_0x1aa8f1(0x134)](_0x31fdd2);
        });
    }, pushback['stopBack'] = function() {
        const _0x26af9d = _0x76c3fa;
        clearInterval(pushback[_0x26af9d(0x12d)]), pushback[_0x26af9d(0x172)] = 0x0, pushback['pushBack'](0x0), clearInterval(pushback[_0x26af9d(0x12d)]);
    }, pushback[_0x76c3fa(0x134)] = function(_0x1edcab) {
        const _0x13edf9 = _0x76c3fa;
        let _0x27e6dc = Math['round'](geofs['animation']['values'][_0x13edf9(0x137)]),
            _0x5497ae = _0x1edcab * Math[_0x13edf9(0x144)](_0x27e6dc * Math['PI'] / 0xb4),
            _0x1082b7 = _0x1edcab * Math[_0x13edf9(0x151)](_0x27e6dc * Math['PI'] / 0xb4);
        geofs[_0x13edf9(0x163)]['instance'][_0x13edf9(0x16b)]['setLinearVelocity']([_0x5497ae, _0x1082b7, 0x0]);
    }, pushback[_0x76c3fa(0x16f)] = function(_0x136d38) {
        const _0x3613ab = _0x76c3fa;
        pushback[_0x3613ab(0x15d)] = _0x136d38, geofs[_0x3613ab(0x12a)]['values'][_0x3613ab(0x141)] = _0x136d38;
    };
    let _0x2e6f7e;

    function _0x37eb5f() {
        const _0x301c68 = _0x76c3fa;
        _0x2e6f7e != void 0x0 && _0x2e6f7e[_0x301c68(0x152)]();
        _0x2e6f7e = window[_0x301c68(0x160)]('', _0x301c68(0x176), 'toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=no,width=780,height=300,top=' + (screen[_0x301c68(0x166)] - 0x190) + _0x301c68(0x133) + (screen[_0x301c68(0x142)] - 0x348)), _0x2e6f7e[_0x301c68(0x159)][_0x301c68(0x146)][_0x301c68(0x131)] = _0x301c68(0x129);
        let _0x2be97a = _0x2e6f7e[_0x301c68(0x159)][_0x301c68(0x16a)](_0x301c68(0x15d)),
            _0x2c809c = _0x2e6f7e['document'][_0x301c68(0x16a)](_0x301c68(0x172)),
            _0xc38209 = _0x2e6f7e[_0x301c68(0x159)][_0x301c68(0x16a)](_0x301c68(0x154)),
            _0x46d315 = _0x2e6f7e[_0x301c68(0x159)][_0x301c68(0x16a)]('reset'),
            _0x2be90c = _0x2e6f7e[_0x301c68(0x159)][_0x301c68(0x16a)](_0x301c68(0x126)),
            _0x3eab34 = _0x2e6f7e[_0x301c68(0x159)]['getElementById'](_0x301c68(0x169));
        _0x2c809c[_0x301c68(0x14d)] = function() {
            const _0x4f3dc8 = _0x301c68;
            pushback[_0x4f3dc8(0x14c)] == !![] && (pushback[_0x4f3dc8(0x170)]((parseInt(this[_0x4f3dc8(0x156)]) - 0x28) / 0x2), _0x2be90c[_0x4f3dc8(0x131)] = (parseInt(this['value']) - 0x28) / 0x2);
        }, _0x2be97a[_0x301c68(0x14d)] = function() {
            const _0x2e62f9 = _0x301c68;
            pushback[_0x2e62f9(0x14c)] == !![] && (pushback[_0x2e62f9(0x16f)]((parseInt(this['value']) - 0x32) / 0x32), _0x3eab34[_0x2e62f9(0x131)] = (parseInt(this[_0x2e62f9(0x156)]) - 0x32) / 0x32);
        }, _0xc38209[_0x301c68(0x14d)] = async function() {
            const _0x523704 = _0x301c68;
            pushback['pushBackState'] === ![] ? pushback[_0x523704(0x130)](geofs[_0x523704(0x163)][_0x523704(0x167)]['id']) === !![] && (geofs[_0x523704(0x163)][_0x523704(0x167)][_0x523704(0x161)] == !![] && geofs[_0x523704(0x12a)][_0x523704(0x168)]['rollingSpeed'] < 0.5 && (await pushback['setUpdate'](), pushback[_0x523704(0x13d)](), pushback[_0x523704(0x14c)] = !![], geofs[_0x523704(0x12a)][_0x523704(0x168)]['pushBackTruck'] = 0x1, defaultFriction = geofs[_0x523704(0x163)][_0x523704(0x167)]['setup'][_0x523704(0x136)][_0x523704(0x171)]['lockSpeed'], geofs[_0x523704(0x163)][_0x523704(0x167)]['setup'][_0x523704(0x136)][_0x523704(0x171)][_0x523704(0x178)] = 0.5)) : (pushback[_0x523704(0x14c)] = ![], geofs[_0x523704(0x12a)]['values'][_0x523704(0x15c)] = 0x0, geofs['aircraft'][_0x523704(0x167)][_0x523704(0x12f)]['pushbackTruck'][_0x523704(0x158)][_0x523704(0x139)](), pushback[_0x523704(0x175)](), pushback[_0x523704(0x145)](), _0x46d315[_0x523704(0x125)]());
        }, _0x46d315['onclick'] = function() {
            const _0x147915 = _0x301c68;
            _0x2be97a[_0x147915(0x156)] = '50', _0x3eab34[_0x147915(0x131)] = '0', _0x2c809c[_0x147915(0x156)] = '40', _0x2be90c[_0x147915(0x131)] = '0', pushback[_0x147915(0x145)](), pushback[_0x147915(0x170)](0x0), pushback[_0x147915(0x145)](), pushback['startYaw'](0x0);
        }, _0x2e6f7e[_0x301c68(0x173)] = function() {
            const _0x41c55e = _0x301c68;
            pushback[_0x41c55e(0x14c)] = ![], geofs['animation'][_0x41c55e(0x168)]['pushBackTruck'] = 0x0, geofs[_0x41c55e(0x163)][_0x41c55e(0x167)][_0x41c55e(0x12f)]['pushbackTruck']['object3d'][_0x41c55e(0x139)](), pushback[_0x41c55e(0x175)](), pushback[_0x41c55e(0x145)](), _0x46d315[_0x41c55e(0x125)]();
        }, _0x2e6f7e[_0x301c68(0x149)]('keydown', function(_0x25810f) {
            const _0x5d2ed6 = _0x301c68;
            if (_0x25810f[_0x5d2ed6(0x12e)] === 0x26 && pushback['speed'] < 0x14) {
                let _0x2f7624 = pushback[_0x5d2ed6(0x172)] + 0.5;
                pushback['startBack'](_0x2f7624), _0x2be90c['innerHTML'] = _0x2f7624, _0x2c809c[_0x5d2ed6(0x156)] = _0x2f7624 * 0x2 + 0x28;
            } else {
                if (_0x25810f[_0x5d2ed6(0x12e)] === 0x28 && pushback[_0x5d2ed6(0x172)] > -0x14) {
                    let _0x568d06 = pushback[_0x5d2ed6(0x172)] - 0.5;
                    pushback[_0x5d2ed6(0x170)](_0x568d06), _0x2be90c[_0x5d2ed6(0x131)] = _0x568d06, _0x2c809c[_0x5d2ed6(0x156)] = _0x568d06 * 0x2 + 0x28;
                } else {
                    if (_0x25810f['keyCode'] === 0x27 && pushback[_0x5d2ed6(0x15d)] < 0x1) {
                        let _0x553f43 = Math[_0x5d2ed6(0x17a)]((pushback[_0x5d2ed6(0x15d)] + 0.02) * 0x64) / 0x64;
                        pushback[_0x5d2ed6(0x16f)](_0x553f43), _0x3eab34[_0x5d2ed6(0x131)] = _0x553f43, _0x2be97a[_0x5d2ed6(0x156)] = _0x553f43 * 0x32 + 0x32;
                    } else {
                        if (_0x25810f[_0x5d2ed6(0x12e)] === 0x25 && pushback[_0x5d2ed6(0x15d)] > -0x1) {
                            let _0x43d785 = Math[_0x5d2ed6(0x17a)]((pushback[_0x5d2ed6(0x15d)] - 0.02) * 0x64) / 0x64;
                            pushback[_0x5d2ed6(0x16f)](_0x43d785), _0x3eab34[_0x5d2ed6(0x131)] = _0x43d785, _0x2be97a[_0x5d2ed6(0x156)] = _0x43d785 * 0x32 + 0x32;
                        }
                    }
                }
            }
        });
    }
    pushback[_0x76c3fa(0x14c)] = ![], pushback['checkAircraft'] = function(_0x2ab80f) {
        return pushbackInfo[_0x2ab80f] ? !![] : ![];
    }, pushback[_0x76c3fa(0x128)] = function() {
        const _0x482a25 = _0x76c3fa;
        for (let _0x91881f = 0x0; _0x91881f < geofs[_0x482a25(0x163)]['instance'][_0x482a25(0x162)][_0x482a25(0x12f)][_0x482a25(0x14a)]; _0x91881f++) {
            if (geofs[_0x482a25(0x163)][_0x482a25(0x167)][_0x482a25(0x162)][_0x482a25(0x12f)][_0x91881f][_0x482a25(0x132)])
                for (let _0x4f6ba4 = 0x0; _0x4f6ba4 < geofs[_0x482a25(0x163)][_0x482a25(0x167)][_0x482a25(0x162)][_0x482a25(0x12f)][_0x91881f]['animations'][_0x482a25(0x14a)]; _0x4f6ba4++) {
                    geofs[_0x482a25(0x163)][_0x482a25(0x167)][_0x482a25(0x162)][_0x482a25(0x12f)][_0x91881f][_0x482a25(0x132)][_0x4f6ba4]['value'] == _0x482a25(0x15d) && (geofs[_0x482a25(0x163)]['instance']['setup']['parts'][_0x91881f][_0x482a25(0x132)][_0x4f6ba4][_0x482a25(0x156)] = 'yawPushback', geofs[_0x482a25(0x163)][_0x482a25(0x167)][_0x482a25(0x162)][_0x482a25(0x12f)][_0x91881f][_0x482a25(0x14f)] && (pushback[_0x482a25(0x14e)] = geofs[_0x482a25(0x163)][_0x482a25(0x167)][_0x482a25(0x162)]['parts'][_0x91881f]['animations'][_0x4f6ba4]['ratio']));
                }
        }
    }, pushback[_0x76c3fa(0x175)] = function() {
        const _0xc0bea3 = _0x76c3fa;
        clearInterval(pushback[_0xc0bea3(0x12d)]), geofs['aircraft'][_0xc0bea3(0x167)]['setup']['contactProperties'][_0xc0bea3(0x171)][_0xc0bea3(0x178)] = defaultFriction;
        for (let _0x1f9728 = 0x0; _0x1f9728 < geofs[_0xc0bea3(0x163)][_0xc0bea3(0x167)]['setup']['parts']['length']; _0x1f9728++) {
            if (geofs['aircraft']['instance']['setup']['parts'][_0x1f9728]['animations'])
                for (let _0x104b0f = 0x0; _0x104b0f < geofs[_0xc0bea3(0x163)][_0xc0bea3(0x167)][_0xc0bea3(0x162)][_0xc0bea3(0x12f)][_0x1f9728]['animations'][_0xc0bea3(0x14a)]; _0x104b0f++) {
                    geofs['aircraft'][_0xc0bea3(0x167)][_0xc0bea3(0x162)][_0xc0bea3(0x12f)][_0x1f9728][_0xc0bea3(0x132)][_0x104b0f][_0xc0bea3(0x156)] == _0xc0bea3(0x141) && (geofs['aircraft']['instance'][_0xc0bea3(0x162)][_0xc0bea3(0x12f)][_0x1f9728][_0xc0bea3(0x132)][_0x104b0f][_0xc0bea3(0x156)] = _0xc0bea3(0x15d));
                }
        }
    }, pushback[_0x76c3fa(0x13d)] = function() {
        pushback['addPushBackTruck']();
    }, pushback[_0x76c3fa(0x15e)] = function() {
        const _0x41d712 = _0x76c3fa;
        if (pushbackInfo[geofs['aircraft'][_0x41d712(0x167)]['id']]) {
            let _0x1c84f4 = {
                'name': _0x41d712(0x14b),
                'model': pushbackModels[pushbackInfo[geofs['aircraft'][_0x41d712(0x167)]['id']][_0x41d712(0x153)]],
                'position': pushbackInfo[geofs[_0x41d712(0x163)][_0x41d712(0x167)]['id']][_0x41d712(0x13f)],
                'animations': [{
                    'type': _0x41d712(0x15f),
                    'axis': 'Z',
                    'value': _0x41d712(0x141),
                    'ratio': pushback['defaultYaw']
                }, {
                    'value': _0x41d712(0x135),
                    'type': _0x41d712(0x157),
                    'value': _0x41d712(0x15c)
                }, {
                    'type': _0x41d712(0x15f),
                    'value': 'atilt',
                    'axis': 'X',
                    'ratio': -0x1
                }],
                'rotation': [0x0, 0x0, 0x0]
            };
            geofs[_0x41d712(0x163)][_0x41d712(0x167)][_0x41d712(0x143)]([_0x1c84f4], _0x41d712(0x150), 0x1, _0x41d712(0x16e));
        }
    };
    let _0x184d9f = document['getElementsByClassName']('geofs-autopilot-bar'),
        _0x5ca6a9 = document[_0x76c3fa(0x147)](_0x76c3fa(0x140));
    _0x5ca6a9[_0x76c3fa(0x155)]['add'](_0x76c3fa(0x164)), _0x5ca6a9['id'] = _0x76c3fa(0x12c), _0x5ca6a9['style'][_0x76c3fa(0x13e)] = _0x76c3fa(0x165), _0x5ca6a9[_0x76c3fa(0x131)] = _0x76c3fa(0x13a), _0x184d9f[0x0][_0x76c3fa(0x15b)](_0x5ca6a9);
    let _0x15fc99 = document[_0x76c3fa(0x16a)](_0x76c3fa(0x12c));
    _0x15fc99[_0x76c3fa(0x125)] = function() {
        _0x37eb5f();
    };
}

function _0x1c81() {
    const _0x53a943 = ['then', 'lockSpeed', '1258782BnpTvr', 'round', '6TtZgaV', '12AvIPhZ', 'onclick', 'speedInfo', '319TOOmos', 'setUpdate', '<style>\x0a.slidecontainer\x20{\x0a\x20\x20width:\x20100%;\x0a\x20\x20/*\x20Width\x20of\x20the\x20outside\x20container\x20*/\x0a}\x0a\x0a/*\x20The\x20slider\x20itself\x20*/\x0a.slider\x20{\x0a\x20\x20-webkit-appearance:\x20none;\x0a\x20\x20/*\x20Override\x20default\x20CSS\x20styles\x20*/\x0a\x20\x20appearance:\x20none;\x0a\x20\x20width:\x2050%;\x0a\x20\x20/*\x20Full-width\x20*/\x0a\x20\x20height:\x2025px;\x0a\x20\x20/*\x20Specified\x20height\x20*/\x0a\x20\x20background:\x20#d3d3d3;\x0a\x20\x20/*\x20Grey\x20background\x20*/\x0a\x20\x20outline:\x20none;\x0a\x20\x20/*\x20Remove\x20outline\x20*/\x0a\x20\x20opacity:\x200.7;\x0a\x20\x20/*\x20Set\x20transparency\x20(for\x20mouse-over\x20effects\x20on\x20hover)\x20*/\x0a\x20\x20-webkit-transition:\x20.2s;\x0a\x20\x20/*\x200.2\x20seconds\x20transition\x20on\x20hover\x20*/\x0a\x20\x20transition:\x20opacity\x20.2s;\x0a}\x0a\x0a/*\x20Mouse-over\x20effects\x20*/\x0a.slider:hover\x20{\x0a\x20\x20opacity:\x201;\x0a\x20\x20/*\x20Fully\x20shown\x20on\x20mouse-over\x20*/\x0a}\x0a\x0a/*\x20The\x20slider\x20handle\x20(use\x20-webkit-\x20(Chrome,\x20Opera,\x20Safari,\x20Edge)\x20and\x20-moz-\x20(Firefox)\x20to\x20override\x20default\x20look)\x20*/\x0a.slider::-webkit-slider-thumb\x20{\x0a\x20\x20-webkit-appearance:\x20none;\x0a\x20\x20/*\x20Override\x20default\x20look\x20*/\x0a\x20\x20appearance:\x20none;\x0a\x20\x20width:\x2025px;\x0a\x20\x20/*\x20Set\x20a\x20specific\x20slider\x20handle\x20width\x20*/\x0a\x20\x20height:\x2025px;\x0a\x20\x20/*\x20Slider\x20handle\x20height\x20*/\x0a\x20\x20background:\x20#04AA6D;\x0a\x20\x20/*\x20Green\x20background\x20*/\x0a\x20\x20cursor:\x20pointer;\x0a\x20\x20/*\x20Cursor\x20on\x20hover\x20*/\x0a}\x0a\x0a.slider::-moz-range-thumb\x20{\x0a\x20\x20width:\x2025px;\x0a\x20\x20/*\x20Set\x20a\x20specific\x20slider\x20handle\x20width\x20*/\x0a\x20\x20height:\x2025px;\x0a\x20\x20/*\x20Slider\x20handle\x20height\x20*/\x0a\x20\x20background:\x20#04AA6D;\x0a\x20\x20/*\x20Green\x20background\x20*/\x0a\x20\x20cursor:\x20pointer;\x0a\x20\x20/*\x20Cursor\x20on\x20hover\x20*/\x0a}\x0a\x0a.center\x20{\x0a\x20\x20font-family:\x20verdana;\x0a\x20\x20display:\x20center;\x0a}\x0a</style>\x0a<input\x20type=\x22checkbox\x22\x20id=\x22pushback\x22\x20name=\x22pushback\x22\x20value=\x22pushback\x22\x20class=\x22center\x22></input>\x0a<labelfor=\x22pushback\x22\x20class=\x22center\x22>\x20Enable\x20pushback\x20</label></p>\x20Yaw:\x0a<div\x20id=\x22yawInfo\x22>0</div>\x0a<div\x20class=\x22slidecontainer\x22>\x0a\x20\x20<input\x20type=\x22range\x22\x20min=\x220\x22\x20max=\x22100\x22\x20value=\x2250\x22\x20class=\x22slider\x22\x20id=\x22yaw\x22>\x0a\x20\x20</p>\x20Speed:\x20<div\x20id=\x22speedInfo\x22>0</div>\x0a\x20\x20<div\x20class=\x22slidecontainer\x22>\x0a\x20\x20\x20\x20<input\x20type=\x22range\x22\x20min=\x220\x22\x20max=\x2280\x22\x20value=\x2240\x22\x20class=\x22slider\x22\x20id=\x22speed\x22>\x0a\x20\x20\x20\x20</p>\x0a\x20\x20\x20\x20<button\x20class=\x22center\x22\x20type=\x22button\x22\x20id=\x22reset\x22>Reset</button>\x0a\x20\x20\x20\x20<br>\x0a\x20\x20</div>', 'animation', '363367mttbUH', 'pushbackButtonMain', 'lockInt', 'keyCode', 'parts', 'checkAircraft', 'innerHTML', 'animations', ',left=', 'pushBack', 'view', 'contactProperties', 'heading360', 'https://raw.githubusercontent.com/TotallyRealElonMusk/GeoFS-Pushback/main/pushback%20data/pushbackModel.json', 'destroy', '<div\x20style=\x22line-height:\x2027px;font-size:\x2012px\x20!important;pointer-events:\x20none;color:\x20#FFF;text-align:\x20center;\x22>PUSHBACK</div>', '4303656PWCiJH', 'json', 'addPushBackTruckHandler', 'cssText', 'pos', 'div', 'yawPushback', 'width', 'addParts', 'sin', 'stopBack', 'body', 'createElement', '1931860IqPriw', 'addEventListener', 'length', 'pushbackTruck', 'pushBackState', 'oninput', 'defaultYaw', 'collisionPoints', 'https://raw.githubusercontent.com/', 'cos', 'close', 'model', 'pushback', 'classList', 'value', 'show', 'object3d', 'document', '75250HvkrXo', 'append', 'pushBackTruck', 'yaw', 'addPushBackTruck', 'rotate', 'open', 'groundContact', 'setup', 'aircraft', 'control-pad', 'width:\x2090px;height:\x2025px;margin:\x200px\x2010px;border-radius:\x2015px;outline:\x20none;', 'height', 'instance', 'values', 'yawInfo', 'getElementById', 'rigidBody', '324036SVkzvQ', '4544724bXaXlh', 'Zup', 'startYaw', 'startBack', 'wheel', 'speed', 'onbeforeunload', '160yAxlOT', 'revertUpdate', 'Title'];
    _0x1c81 = function() {
        return _0x53a943;
    };
    return _0x1c81();
}
    function initPushback() {
        // Example: Implement pushback functionality
        console.log('GeoFS Pushback Initialized');
        // Additional code for pushback functionality
    }
    initPushback();
})();
// ==/GeoFS Pushback==

// ==GeoFS GPWS Callouts==
(function() {
    // GPWS callouts initialization code
    // ==UserScript==
// @name         GeoFS GPWS callouts
// @version      1.2
// @description  Adds some GPWS callouts
// @author       GGamerGGuy
// @match        https://www.geo-fs.com/geofs.php?v=*
// @match        https://*.geo-fs.com/geofs.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geo-fs.com
// @grant        none
// ==/UserScript==
setTimeout((function() {
    'use strict';
    window.soundsToggleKey = "w"; //CHANGE THIS LETTER TO CHANGE THE KEYBOARD SHORTCUT TO TOGGLE THE SOUNDS.
    window.soundsOn = true; //This decides whether callouts are on by default or off by default.
    window.a2500 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/2500.wav');
    window.a2000 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/2000.wav');
    window.a1000 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/1000.wav');
    window.a500 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/500.wav');
    window.a400 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/400.wav');
    window.a300 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/300.wav');
    window.a200 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/200.wav');
    window.a100 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/100.wav');
    window.a50 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/50.wav');
    window.a40 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/40.wav');
    window.a30 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/30.wav');
    window.a20 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/20.wav');
    window.a10 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/10.wav');
    window.aRetard = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/retard.wav');
    window.a5 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/5.wav');
    window.stall = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/stall.wav');
    window.glideSlope = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/glideslope.wav');
    window.tooLowFlaps = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/too-low_flaps.wav');
    window.tooLowGear = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/too-low_gear.wav');
    window.apDisconnect = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/ap-disconnect.wav');
    window.minimumBaro = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/minimum.wav');
    window.dontSink = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/dont-sink.wav');
    window.masterA = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/masterAlarm.wav');
    window.bankAngle = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/bank-angle.wav');
    window.overspeed = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/overspeed.wav');
    window.justPaused = false;
    window.masterA.loop = true;
    window.bankAngle.loop = true;
    window.overspeed.loop = true;
    window.iminimums = false;
    window.i2500 = false;
    window.i2000 = false;
    window.i1000 = false;
    window.i500 = false;
    window.i400 = false;
    window.i300 = false;
    window.i200 = false;
    window.i100 = false;
    window.i50 = false;
    window.i40 = false;
    window.i30 = false;
    window.i20 = false;
    window.i10 = false;
    window.i7 = false;
    window.i5 = false;
    window.gpwsRefreshRate = 100;
    window.willTheDoorFallOff = false;
    window.didAWheelFall = false;
    function isInRange(i, a, vs) {
        if (i >= 100) {
            if ((i <= a+10) && (i >= a-10)) {
                return true;
            }
        } else if (i >= 10) {
            if ((i < a+4) && (i > a-4)) {
                return true;
            }
        } else {
            if (i <= a+1 && i >= a-1) {
                return true;
            }
        }
        return false;
    }
    window.wasAPOn = false;
    //window.isRadioPanelOpen = false;
    var flightDataElement = document.getElementById('flightDataDisplay1');
    if (!flightDataElement) {
        var bottomDiv = document.getElementsByClassName('geofs-ui-bottom')[0];
        flightDataElement = document.createElement('div');
        flightDataElement.id = 'flightDataDisplay1';
        flightDataElement.classList = 'mdl-button';
        bottomDiv.appendChild(flightDataElement);
    }

    flightDataElement.innerHTML = `
                <input style="background: 0 0; border: none; border-radius: 2px; color: #000; display: inline-block; padding: 0 8px;" placeholder="Minimums (Baro)" id="minimums">
            `;
    function updateGPWS() {
        // Check if geofs.animation.values is available
        if (typeof geofs.animation.values != 'undefined' && !geofs.isPaused()) {
            if (window.justPaused) {
                window.justPaused = false;
            }
            window.willTheDoorFallOff = geofs.aircraft.instance.aircraftRecord.name.includes("Boeing");
            window.isAsOldAsYourMom = geofs.aircraft.instance.aircraftRecord.name.includes("757") || geofs.aircraft.instance.aircraftRecord.name.includes("767");
            if (window.isAsOldAsYourMom && !window.wasAsOldAsYourMom) {
                window.a2500 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/b2500.wav');
                window.a2000 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/b2000.wav');
                window.a1000 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/o1000.wav');
                window.a500 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/o500.wav');
                window.a400 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/o400.wav');
                window.a300 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/o300.wav');
                window.a200 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/o200.wav');
                window.a100 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/o100.wav');
                window.a50 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/o50.wav');
                window.a40 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/o40.wav');
                window.a30 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/o30.wav');
                window.a20 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/o20.wav');
                window.a10 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/o10.wav');
                window.a5 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/b5.wav');
                window.stall = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/bstall.wav');
                window.glideSlope = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/oglideslope.wav');
                window.tooLowFlaps = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/otoo-low_flaps.wav');
                window.tooLowGear = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/otoo-low_gear.wav');
                window.apDisconnect = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/bap-disconnect.wav');
                window.minimumBaro = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/ominimums.wav');
                window.dontSink = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/odont-sink.wav');
                window.masterA = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/bmasterAlarm.wav');
                window.bankAngle = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/obank-angle.wav');
                window.overspeed = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/boverspeed.wav');
                window.masterA.loop = true;
                window.bankAngle.loop = true;
                window.overspeed.loop = true;
            } else if (window.willTheDoorFallOff && !window.didAWheelFall && !window.isAsOldAsYourMom) {
                window.a2500 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/b2500.wav');
                window.a2000 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/b2000.wav');
                window.a1000 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/b1000.wav');
                window.a500 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/b500.wav');
                window.a400 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/b400.wav');
                window.a300 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/b300.wav');
                window.a200 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/b200.wav');
                window.a100 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/b100.wav');
                window.a50 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/b50.wav');
                window.a40 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/b40.wav');
                window.a30 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/b30.wav');
                window.a20 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/b20.wav');
                window.a10 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/b10.wav');
                window.a5 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/b5.wav');
                window.stall = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/bstall.wav');
                window.glideSlope = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/bglideslope.wav');
                window.tooLowFlaps = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/btoo-low_flaps.wav');
                window.tooLowGear = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/btoo-low_gear.wav');
                window.apDisconnect = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/bap-disconnect.wav');
                window.minimumBaro = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/bminimums.wav');
                window.dontSink = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/bdont-sink.wav');
                window.masterA = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/bmasterAlarm.wav');
                window.bankAngle = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/bbank-angle.wav');
                window.overspeed = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/boverspeed.wav');
                window.masterA.loop = true;
                window.bankAngle.loop = true;
                window.overspeed.loop = true;
            } else if (!window.willTheDoorFallOff && window.didAWheelFall) {
                window.a2500 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/2500.wav');
                window.a2000 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/2000.wav');
                window.a1000 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/1000.wav');
                window.a500 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/500.wav');
                window.a400 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/400.wav');
                window.a300 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/300.wav');
                window.a200 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/200.wav');
                window.a100 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/100.wav');
                window.a50 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/50.wav');
                window.a40 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/40.wav');
                window.a30 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/30.wav');
                window.a20 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/20.wav');
                window.a10 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/10.wav');
                window.a5 = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/5.wav');
                window.stall = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/stall.wav');
                window.glideSlope = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/glideslope.wav');
                window.tooLowFlaps = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/too-low_flaps.wav');
                window.tooLowGear = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/too-low_gear.wav');
                window.apDisconnect = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/ap-disconnect.wav');
                window.minimumBaro = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/minimum.wav');
                window.dontSink = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/dont-sink.wav');
                window.masterA = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/masterAlarm.wav');
                window.bankAngle = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/bank-angle.wav');
                window.overspeed = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/overspeed.wav');
                window.masterA.loop = true;
                window.bankAngle.loop = true;
                window.overspeed.loop = true;
            }
            // Retrieve and format the required values
            var minimum = ((document.getElementById("minimums") !== null) && document.getElementById("minimums").value !== undefined) ? Number(document.getElementById("minimums").value) : undefined;
            var agl = (geofs.animation.values.altitude !== undefined && geofs.animation.values.groundElevationFeet !== undefined) ? Math.round((geofs.animation.values.altitude - geofs.animation.values.groundElevationFeet) + (geofs.aircraft.instance.collisionPoints[geofs.aircraft.instance.collisionPoints.length - 2].worldPosition[2]*3.2808399)) : 'N/A';
            var verticalSpeed = geofs.animation.values.verticalSpeed !== undefined ? Math.round(geofs.animation.values.verticalSpeed) : 'N/A';
            //Glideslope calculation
            var glideslope;
            if (geofs.animation.getValue("NAV1Direction") && (geofs.animation.getValue("NAV1Distance") !== geofs.runways.getNearestRunway([geofs.nav.units.NAV1.navaid.lat,geofs.nav.units.NAV1.navaid.lon,0]).lengthMeters*0.185)) { //The second part to the if statement prevents the divide by 0 error.
                glideslope = (geofs.animation.getValue("NAV1Direction") === "to") ? Number((Math.atan(((geofs.animation.values.altitude/3.2808399+(geofs.aircraft.instance.collisionPoints[geofs.aircraft.instance.collisionPoints.length - 2].worldPosition[2]+0.1))-geofs.nav.units.NAV1.navaid.elevation) / (geofs.animation.getValue("NAV1Distance")+geofs.runways.getNearestRunway([geofs.nav.units.NAV1.navaid.lat,geofs.nav.units.NAV1.navaid.lon,0]).lengthMeters*0.185))*RAD_TO_DEGREES).toFixed(1)) : Number((Math.atan(((geofs.animation.values.altitude/3.2808399+(geofs.aircraft.instance.collisionPoints[geofs.aircraft.instance.collisionPoints.length - 2].worldPosition[2]+0.1))-geofs.nav.units.NAV1.navaid.elevation) / Math.abs(geofs.animation.getValue("NAV1Distance")-geofs.runways.getNearestRunway([geofs.nav.units.NAV1.navaid.lat,geofs.nav.units.NAV1.navaid.lon,0]).lengthMeters*0.185))*RAD_TO_DEGREES).toFixed(1));
            } else {
                glideslope = undefined;
            } //End Glideslope calculation
            if (audio.on && window.soundsOn) {
                if (((geofs.aircraft.instance.stalling && !geofs.aircraft.instance.groundContact) || (geofs.nav.units.NAV1.navaid !== null && (agl > 100 && (glideslope < (geofs.nav.units.NAV1.navaid.slope - 1.5) || (glideslope > geofs.nav.units.NAV1.navaid.slope + 2)))) || (!geofs.aircraft.instance.groundContact && agl < 300 && (geofs.aircraft.instance.definition.gearTravelTime !== undefined) && (geofs.animation.values.gearPosition >= 0.5)) || (!geofs.aircraft.instance.groundContact && agl < 500 && (geofs.animation.values.flapsSteps !== undefined) && (geofs.animation.values.flapsPosition == 0) && window.tooLowGear.paused) || (!geofs.aircraft.instance.groundContact && agl < 300 && geofs.animation.values.throttle > 0.95 && verticalSpeed <= 0) || (Math.abs(geofs.aircraft.instance.animationValue.aroll) > 45)) && window.masterA.paused) {
                    window.masterA.play();
                } else if (!((geofs.aircraft.instance.stalling && !geofs.aircraft.instance.groundContact) || (geofs.nav.units.NAV1.navaid !== null && (agl > 100 && (glideslope < (geofs.nav.units.NAV1.navaid.slope - 1.5) || (glideslope > geofs.nav.units.NAV1.navaid.slope + 2)))) || (!geofs.aircraft.instance.groundContact && agl < 300 && (geofs.aircraft.instance.definition.gearTravelTime !== undefined) && (geofs.animation.values.gearPosition >= 0.5)) || (!geofs.aircraft.instance.groundContact && agl < 500 && (geofs.animation.values.flapsSteps !== undefined) && (geofs.animation.values.flapsPosition == 0) && window.tooLowGear.paused) || (!geofs.aircraft.instance.groundContact && agl < 300 && geofs.animation.values.throttle > 0.95 && verticalSpeed <= 0) || (Math.abs(geofs.aircraft.instance.animationValue.aroll) > 45)) && !window.masterA.paused) {
                    window.masterA.pause();
                }
                if (Math.abs(geofs.aircraft.instance.animationValue.aroll) > 45 && window.bankAngle.paused) {
                    window.bankAngle.play();
                } else if (!(Math.abs(geofs.aircraft.instance.animationValue.aroll) > 45) && !window.bankAngle.paused) {
                    window.bankAngle.pause();
                }
                if (geofs.aircraft.instance.stalling && !geofs.aircraft.instance.groundContact && window.stall.paused) { //Stall
                    window.stall.play();
                } else if (!window.stall.paused && !geofs.aircraft.instance.stalling) {
                    window.stall.pause();
                }
                if (geofs.nav.units.NAV1.navaid !== null && (agl > 100 && (glideslope < (geofs.nav.units.NAV1.navaid.slope - 1.5) || (glideslope > geofs.nav.units.NAV1.navaid.slope + 2)) && window.glideSlope.paused)) { //Glideslope
                    window.glideSlope.play();
                }
                if (!geofs.aircraft.instance.groundContact && agl < 300 && (geofs.aircraft.instance.definition.gearTravelTime !== undefined) && (geofs.animation.values.gearPosition >= 0.5) && window.tooLowGear.paused) { //Too Low - Gear (This warning takes priority over the Too Low - Flaps warning)
                    window.tooLowGear.play();
                }
                if (!geofs.aircraft.instance.groundContact && agl < 500 && (geofs.animation.values.flapsSteps !== undefined) && (geofs.animation.values.flapsPosition == 0) && window.tooLowGear.paused && window.tooLowFlaps.paused) { //Too Low - Flaps
                    window.tooLowFlaps.play();
                }
                if (!geofs.autopilot.on && window.wasAPOn) { //Autopilot Disconnect
                    window.apDisconnect.play();
                }
                if (verticalSpeed <= 0) {
                    if (!geofs.aircraft.instance.groundContact && agl < 300 && geofs.animation.values.throttle > 0.95 && window.dontSink.paused) { //Don't Sink
                        window.dontSink.play();
                    }
                    if ((minimum !== undefined) && (geofs.animation.values.altitude+2 > minimum && minimum > geofs.animation.values.altitude-2) && !window.iminimums) { //Minimum
                        window.minimumBaro.play();
                        window.iminimums = true;
                    }
                    if (isInRange(2500, agl) && !window.i2500) { //2,500
                        window.a2500.play();
                        window.i2500 = true;
                    }
                    if (isInRange(2000, agl) && !window.i2000) { //2,000
                        window.a2000.play();
                        window.i2000 = true;
                    }
                    if (isInRange(1000, agl) && !window.i1000) { //1,000
                        window.a1000.play();
                        window.i1000 = true;
                    }
                    if (isInRange(500, agl) && !window.i500) { //500
                        window.a500.play();
                        window.i500 = true;
                    }
                    if (isInRange(400, agl) && !window.i400) { //400
                        window.a400.play();
                        window.i400 = true;
                    }
                    if (isInRange(300, agl) && !window.i300) { //300
                        window.a300.play();
                        window.i300 = true;
                    }
                    if (isInRange(200, agl) && !window.i200) { //200
                        window.a200.play();
                        window.i200 = true;
                    }
                    if (isInRange(100, agl) && !window.i100) { //100
                        window.a100.play();
                        window.i100 = true;
                    }
                    if (isInRange(50, agl) && !window.i50) { //50
                        window.a50.play();
                        window.i50 = true;
                    }
                    if (isInRange(40, agl) && !window.i40) { //40
                        window.a40.play();
                        window.i40 = true;
                    }
                    if (isInRange(30, agl) && !window.i30) { //30
                        window.a30.play();
                        window.i30 = true;
                    }
                    if (isInRange(20, agl) && !window.i20) { //20
                        window.a20.play();
                        window.i20 = true;
                    }
                    if (isInRange(10, agl) && !window.i10) { //10
                        window.a10.play();
                        window.i10 = true;
                    }
                    if (!geofs.aircraft.instance.groundContact && ((agl+(geofs.animation.values.verticalSpeed/60)*2) <= 1.0) && !window.i7) { //Retard 2 seconds from touchdown
                        window.aRetard.play();
                        window.i7 = true;
                    }
                    if (isInRange(5, agl) && !window.i5) { //5
                        window.a5.play();
                        window.i5 = true;
                    }
                    window.gpwsRefreshRate = 30;
                } else if (verticalSpeed > 0) {
                    if (window.iminimums) {
                        window.iminimums = false;
                    }
                    if (window.i2500) {
                        window.i2500 = false;
                    }
                    if (window.i2000) {
                        window.i2000 = false;
                    }
                    if (window.i1000) {
                        window.i1000 = false;
                    }
                    if (window.i500) {
                        window.i500 = false;
                    }
                    if (window.i400) {
                        window.i400 = false;
                    }
                    if (window.i300) {
                        window.i300 = false;
                    }
                    if (window.i200) {
                        window.i200 = false;
                    }
                    if (window.i100) {
                        window.i100 = false;
                    }
                    if (window.i50) {
                        window.i50 = false;
                    }
                    if (window.i40) {
                        window.i40 = false;
                    }
                    if (window.i30) {
                        window.i30 = false;
                    }
                    if (window.i20) {
                        window.i20 = false;
                    }
                    if (window.i10) {
                        window.i10 = false;
                    }
                    if (window.i7) {
                        window.i7 = false;
                    }
                    if (window.i5) {
                        window.i5 = false;
                    }
                    window.gpwsRefreshRate = 100;
                }
            }
        } else if (geofs.isPaused() && !window.justPaused) {
            window.a2500.pause();
            window.a2000.pause();
            window.a1000.pause();
            window.a500.pause();
            window.a400.pause();
            window.a300.pause();
            window.a200.pause();
            window.a100.pause();
            window.a50.pause();
            window.a40.pause();
            window.a30.pause();
            window.a20.pause();
            window.a10.pause();
            window.aRetard.pause();
            window.a5.pause();
            window.stall.pause();
            window.glideSlope.pause();
            window.tooLowFlaps.pause();
            window.tooLowGear.pause();
            window.apDisconnect.pause();
            window.minimumBaro.pause();
            window.dontSink.pause();
            window.masterA.pause();
            window.bankAngle.pause();
            window.overspeed.pause();
            window.justPaused = true;
        }
        window.wasAPOn = geofs.autopilot.on;
        window.didAWheelFall = window.willTheDoorFallOff;
        window.wasAsOldAsYourMom = geofs.aircraft.instance.aircraftRecord.name.includes("757") || geofs.aircraft.instance.aircraftRecord.name.includes("767");
    }

    // Update flight data display every 100ms
    setInterval(updateGPWS, window.gpwsRefreshRate);
    document.addEventListener('keydown', function(event) {
        if (event.key === window.soundsToggleKey) {
            window.soundsOn = !window.soundsOn;
        }
    });
}), 8000);
    function initGPWSCallouts() {
        // Example: Add GPWS callouts to the simulation
        console.log('GeoFS GPWS Callouts Initialized');
        // Additional code for GPWS callouts
    }
    initGPWSCallouts();
})();
// ==/GeoFS GPWS Callouts==

// ==GeoFS Landing Stats==
(function() {
    // Landing stats initialization code
    // ==UserScript==
// @name         GeoFS Landing Stats
// @version      0.4.5.3
// @description  Adds some landing statistics to GeoFS
// @author       GGamerGGuy (UI improvements by Radioactive Potato and mostypc123)
// @match        https://geo-fs.com/geofs.php*
// @match        https://*.geo-fs.com/geofs.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geo-fs.com
// @grant        none
// ==/UserScript==

setTimeout((function() {
    'use strict';

    window.closeTimer = false; // Set to true if you want a timer to close the landing stats. Set to false if you want to manually close the landing stats.
    window.closeSeconds = 10; // Number of seconds to wait before closing the landing stats.

    window.refreshRate = 20;
    window.counter = 0;
    window.isLoaded = false;

    window.justLanded = false;
    window.vertSpeed = 0;
    window.oldAGL = 0;
    window.newAGL = 0;
    window.calVertS = 0;
    window.groundSpeed = 0;
    window.ktias = 0;
    window.kTrue = 0;
    window.bounces = 0;
    window.statsOpen = false;
    window.isGrounded = true;
    window.isInTDZ = false;

    window.softLanding = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/soft_landing.wav');
    window.hardLanding = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/hard_landing.wav');
    window.crashLanding = new Audio('https://tylerbmusic.github.io/GPWS-files_geofs/crash_landing.wav');

    window.statsDiv = document.createElement('div');
    window.statsDiv.style.width = 'fit-content';
    window.statsDiv.style.height = 'fit-content';
    window.statsDiv.style.background = 'linear-gradient(to bottom right, rgb(29, 52, 87), rgb(20, 40, 70))';
    window.statsDiv.style.zIndex = '100000';
    window.statsDiv.style.margin = '30px';
    window.statsDiv.style.padding = '15px';
    window.statsDiv.style.fontFamily = 'Arial, sans-serif';
    window.statsDiv.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.2)';
    window.statsDiv.style.color = 'white';
    window.statsDiv.style.position = 'fixed';
    window.statsDiv.style.borderRadius = '12px';
    window.statsDiv.style.left = '-50%';
    window.statsDiv.style.transition = '0.4s ease';
    window.statsDiv.style.border = '1px solid rgba(255,255,255,0.1)';
    document.body.appendChild(window.statsDiv);

    function updateLndgStats() {
        if (geofs.cautiousWithTerrain == false && !geofs.isPaused()) {
            var ldgAGL = (geofs.animation.values.altitude !== undefined && geofs.animation.values.groundElevationFeet !== undefined) ? ((geofs.animation.values.altitude - geofs.animation.values.groundElevationFeet) + (geofs.aircraft.instance.collisionPoints[geofs.aircraft.instance.collisionPoints.length - 2].worldPosition[2]*3.2808399)) : 'N/A';
            if (ldgAGL < 500) {
                window.justLanded = (geofs.animation.values.groundContact && !window.isGrounded);
                if (window.justLanded && !window.statsOpen) {
                    if (window.closeTimer) {
                        setTimeout(window.closeLndgStats, 1000*window.closeSeconds);
                    }
                    window.statsOpen = true;
                    window.statsDiv.innerHTML = `
                <button style="
                    right: 10px; 
                    top: 10px; 
                    position: absolute; 
                    background: rgba(255,255,255,0.2); 
                    border: none; 
                    color: white; 
                    cursor: pointer; 
                    width: 30px; 
                    height: 30px; 
                    border-radius: 50%; 
                    font-weight: bold;" 
                    onclick="window.closeLndgStats()">✕</button>
                    <style>
                        .info-block {
                            display: grid;
                            grid-template-columns: repeat(2, 1fr);
                            gap: 10px;
                            font-size: 14px;
                        }
                        .landing-quality {
                            grid-column: 1 / -1;
                            text-align: center;
                            font-weight: bold;
                            margin-top: 10px;
                            padding: 5px;
                            border-radius: 5px;
                        }
                    </style>
                    <div class="info-block">
                        <span>Vertical speed: ${window.vertSpeed} fpm</span>
                        <span>G-Forces: ${(geofs.animation.values.accZ/9.80665).toFixed(2)}G</span>
                        <span>Terrain-calibrated V/S: ${window.calVertS.toFixed(1)}</span>
                        <span>True airspeed: ${window.kTrue} kts</span>
                        <span>Ground speed: ${window.groundSpeed.toFixed(1)} kts</span>
                        <span>Indicated speed: ${window.ktias} kts</span>
                        <span>Roll: ${geofs.animation.values.aroll.toFixed(1)} degrees</span>
                        <span>Tilt: ${geofs.animation.values.atilt.toFixed(1)} degrees</span>
                        <span id="bounces">Bounces: 0</span>
                    </div>
                `;
                    window.statsDiv.style.left = '0px';
                    if (geofs.nav.units.NAV1.inRange) {
                        window.statsDiv.innerHTML += `
                        <div style="margin-top: 10px; font-size: 14px;">
                            <span>Landed in TDZ? ${window.isInTDZ}</span>
                            <span>Deviation from center: ${geofs.nav.units.NAV1.courseDeviation.toFixed(1)}</span>
                        </div>`;
                    }
                    if (Number(window.vertSpeed) < 0) {
                        let qualityClass = '';
                        let qualityText = '';
                        if (Number(window.vertSpeed) >= -50) {
                            qualityClass = 'landing-quality';
                            qualityText = 'SUPER BUTTER!';
                            window.statsDiv.innerHTML += `
                                <div class="${qualityClass}" style="background-color: green; color: white;">
                                    ${qualityText}
                                </div>`;
                            window.softLanding.play();
                        } else if (Number(window.vertSpeed) >= -200) {
                            qualityClass = 'landing-quality';
                            qualityText = 'BUTTER';
                            window.statsDiv.innerHTML += `
                                <div class="${qualityClass}" style="background-color: green; color: white;">
                                    ${qualityText}
                                </div>`;
                            window.softLanding.play();
                        } else if (Number(window.vertSpeed) >= -500 && Number(window.vertSpeed) < -200) {
                            window.hardLanding.play();
                            window.statsDiv.innerHTML += `
                                <div class="${qualityClass}" style="background-color: yellow; color: black;">
                                    ACCEPTABLE
                                </div>`;
                        } else if (Number(window.vertSpeed) >= -1000 && Number(window.vertSpeed) < -500) {
                            window.hardLanding.play();
                            window.statsDiv.innerHTML += `
                                <div class="${qualityClass}" style="background-color: red; color: white;">
                                    HARD LANDING
                                </div>`;
                        }
                    }
                    if (Number(window.vertSpeed) <= -1000 || Number(window.vertSpeed > 200)) {
                        window.crashLanding.play();
                        window.statsDiv.innerHTML += `
                            <div class="landing-quality" style="background-color: crimson; color: white;">
                                u ded
                            </div>`;
                    }
                } else if (window.justLanded && window.statsOpen) {
                    window.bounces++;
                    var bounceP = document.getElementById("bounces");
                    bounceP.innerHTML = `Bounces: ${window.bounces}`;
                    window.softLanding.pause();
                }
                if (geofs.nav.units.NAV1.inRange) {
                    window.isInTDZ = ((geofs.nav.units.NAV1.distance * FEET_TO_METERS) > (0.052902913939976676 * geofs.runways.getNearestRunway([geofs.nav.units.NAV1.navaid.lat,geofs.nav.units.NAV1.navaid.lon,0]).lengthMeters)) && ((geofs.nav.units.NAV1.distance * FEET_TO_METERS) < (0.0613682505348497385 * geofs.runways.getNearestRunway([geofs.nav.units.NAV1.navaid.lat,geofs.nav.units.NAV1.navaid.lon,0]).lengthMeters)) ? "Yes" : "No";
                }
                window.groundSpeed = geofs.animation.values.groundSpeedKnt;
                window.ktias = geofs.animation.values.kias.toFixed(1);
                window.kTrue = geofs.aircraft.instance.trueAirSpeed.toFixed(1);
                window.vertSpeed = geofs.animation.values.verticalSpeed.toFixed(1);
                window.gForces = geofs.animation.values.accZ/9.80665;
                window.isGrounded = geofs.animation.values.groundContact;
                window.refreshRate = 12;
            } else {
                window.refreshRate = 60;
            }
        }
    }
    setInterval(updateLndgStats, window.refreshRate);

    function updateCalVertS() {
        if ((typeof geofs.animation.values != 'undefined' &&
             !geofs.isPaused()) &&
            ((geofs.animation.values.altitude !== undefined && geofs.animation.values.groundElevationFeet !== undefined) ? ((geofs.animation.values.altitude - geofs.animation.values.groundElevationFeet) + (geofs.aircraft.instance.collisionPoints[geofs.aircraft.instance.collisionPoints.length - 2].worldPosition[2]*3.2808399)) : 'N/A') !== window.oldAGL) {
            window.newAGL = (geofs.animation.values.altitude !== undefined && geofs.animation.values.groundElevationFeet !== undefined) ? ((geofs.animation.values.altitude - geofs.animation.values.groundElevationFeet) + (geofs.aircraft.instance.collisionPoints[geofs.aircraft.instance.collisionPoints.length - 2].worldPosition[2]*3.2808399)) : 'N/A';
            window.newTime = Date.now();
            window.calVertS = (window.newAGL - window.oldAGL) * (60000/(window.newTime - window.oldTime));
            window.oldAGL = (geofs.animation.values.altitude !== undefined && geofs.animation.values.groundElevationFeet !== undefined) ? ((geofs.animation.values.altitude - geofs.animation.values.groundElevationFeet) + (geofs.aircraft.instance.collisionPoints[geofs.aircraft.instance.collisionPoints.length - 2].worldPosition[2]*3.2808399)) : 'N/A';
            window.oldTime = Date.now();
        }
    }
    setInterval(updateCalVertS, 25);

    window.closeLndgStats = function() {
        window.statsDiv.style.left = '-50%';
        setTimeout((function() {
            window.statsDiv.innerHTML = ``;
            window.statsOpen = false;
            window.bounces = 0;
        }), 400);
    }
}), 1000);
    function initLandingStats() {
        // Example: Display landing statistics
        console.log('GeoFS Landing Stats Initialized');
        // Additional code to display landing stats
    }
    initLandingStats();
})();
// ==/GeoFS Landing Stats==

// == GeoFS-chat-cleaner ==
(function() {
    // GeoFS-chat-cleaner initialization code
    // ==UserScript==
// @name         Chat cleaner
// @namespace    https://github.com/KittenApps-Films/Geofs-chat-cleaner
// @version      2025-02-09
// @description  Filters GeoFS chat for bad words
// @author       Noah S. Davidson, GeoFS call sign KittenFilms[KFA]
// @match        http://geo-fs.com/geofs.php?v=*
// @match        http://www.geo-fs.com/geofs.php?v=*
// @match        https://geo-fs.com/geofs.php?v=*
// @match        https://www.geo-fs.com/geofs.php?v=*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geo-fs.com
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geo-fs.com
// @grant        none
// ==/UserScript==

window.addEventListener('load', function() {
    'use strict';
    let exeptions = ["fun", "cockpit", "fuel"]
    let bad = ["wtf", "damn"]
    var cleaner = document.createElement('script');
    cleaner.src="https://cdn.jsdelivr.net/npm/profanity-cleaner@latest";
    cleaner.id = "profanity-cleaner";
    document.body.appendChild(cleaner);
    var words = document.createElement('script');
    var stringE = ""
    var stringA = ""
    exeptions.forEach(exe)
    bad.forEach(maker)
    words.innerHTML = "let exeptions = [" + stringE + "]; let newBad = [" + stringA + "];";
    function exe(item, index) {
        stringE += "\""+item+"\","
    }
    function maker(item, index) {
        stringA += "\""+item+"\","
    }
    words.id = "Chat cleaner exeptions and allowed";
    document.body.appendChild(words);
    var chat = document.createElement('script');
    chat.src="https://kittenapps-films.github.io/Geofs-chat-cleaner/chat-cleaner.js";
    chat.id = "Chat cleaner add-on";
    document.body.appendChild(chat);
    console.log("Chat cleaner installed");
})
    function init() {
        // Example: Clean up the chat
        console.log('GeoFS-chat-cleaner Initialized');
        // Additional code for  enhancements
    }
    init();
})();
// == GeoFS-chat-cleaner ==
 
// == Better-GeoFS-NAV-Map ==
(function() {
    // Better-GeoFS-NAV-Map initialization code
    function init() {
        // Example: better nav map
        console.log('Better-GeoFS-NAV-Map Initialized');
        // Additional code for  enhancements
    }
    init();
})();
// == Better-GeoFS-NAV-Map ==

// == Screen-Space Reflection Shader ==
(function() {
    // Screen-Space Reflection Shader initialization code
    geofs["rrt.glsl"] = "" + '\n//Using a modified version of the default CesiumJS AO shader for base functions\nuniform sampler2D depthTexture;\nuniform sampler2D colorTexture;\nuniform int viewType;\nuniform bool smoothNormals;\nuniform bool isEnabled;\nuniform float strength;\nvarying vec2 v_textureCoordinates;\n#ifdef GL_OES_standard_derivatives\n    #extension GL_OES_standard_derivatives : enable\n#endif  \n\n//#define CZM_SELECTED_FEATURE \n\nfloat rand(vec2 co){\n    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);\n}\n\nvec4 clipToEye(vec2 uv, float depth)\n{\n    vec2 xy = vec2((uv.x * 2.0 - 1.0), ((1.0 - uv.y) * 2.0 - 1.0));\n    vec4 posEC = czm_inverseProjection * vec4(xy, depth, 1.0);\n    posEC = posEC / posEC.w;\n    return posEC;\n}\n\nvec4 depthToView(vec2 texCoord, float depth) {\n    vec4 ndc = vec4(texCoord, depth, 1.0) * 2.0 - 1.0;\n    vec4 viewPos = czm_inverseProjection * ndc;\n    return viewPos / viewPos.w;\n}\n\nvec3 viewToDepth(vec3 pos)\n{\n  vec4 clip = czm_projection * vec4(pos,1.0);\n  vec3 ndc = clip.xyz / clip.w;\n  return ndc * .5 + .5;\n}\n\n//Reconstruct Normal Without Edge Removation\nvec3 getNormalXEdge(vec3 posInCamera, float depthU, float depthD, float depthL, float depthR, vec2 pixelSize)\n{\n    vec4 posInCameraUp = clipToEye(v_textureCoordinates - vec2(0.0, pixelSize.y), depthU);\n    vec4 posInCameraDown = clipToEye(v_textureCoordinates + vec2(0.0, pixelSize.y), depthD);\n    vec4 posInCameraLeft = clipToEye(v_textureCoordinates - vec2(pixelSize.x, 0.0), depthL);\n    vec4 posInCameraRight = clipToEye(v_textureCoordinates + vec2(pixelSize.x, 0.0), depthR);\n\n    vec3 up = posInCamera.xyz - posInCameraUp.xyz;\n    vec3 down = posInCameraDown.xyz - posInCamera.xyz;\n    vec3 left = posInCamera.xyz - posInCameraLeft.xyz;\n    vec3 right = posInCameraRight.xyz - posInCamera.xyz;\n\n    vec3 DX = length(left) < length(right) ? left : right;\n    vec3 DY = length(up) < length(down) ? up : down;\n\n    return normalize(cross(DY, DX));\n}\n\n\n\n\n//smooth normals with blur\nvec3 recNormals(vec3 pos) {\n  float dMp = 0.006 * pos.z; //how far we sample from the original point\n  vec3 P0 = depthToView(pos.xy, pos.z).xyz;\n  vec3 normal = normalize(cross(dFdx(P0), dFdy(P0)));\n  float d1 = czm_readDepth(depthTexture, vec2(pos.x + dMp, pos.y + dMp));\n  float d2 = czm_readDepth(depthTexture, vec2(pos.x - dMp, pos.y + dMp));\n  float d3 = czm_readDepth(depthTexture, vec2(pos.x + dMp, pos.y - dMp));\n  float d4 = czm_readDepth(depthTexture, vec2(pos.x - dMp, pos.y - dMp));\n  \n  vec3 P1 = depthToView(vec2(pos.x + dMp, pos.y + dMp), d1).xyz;\n  vec3 P2 = depthToView(vec2(pos.x - dMp, pos.y + dMp), d2).xyz;\n  vec3 P3 = depthToView(vec2(pos.x + dMp, pos.y - dMp), d3).xyz;\n  vec3 P4 = depthToView(vec2(pos.x - dMp, pos.y - dMp), d4).xyz;\n  vec3 normal1 = normalize(cross(dFdx(P1), dFdy(P1)));\n  vec3 normal2 = normalize(cross(dFdx(P2), dFdy(P2)));\n  vec3 normal3 = normalize(cross(dFdx(P3), dFdy(P3)));\n  vec3 normal4 = normalize(cross(dFdx(P4), dFdy(P4)));\n  if (normal1 == vec3(0.0)) { // fix edge blending\n    normal1 = normal;\n  }\n\n  if (normal2 == vec3(0.0)) {\n    normal2 = normal;\n  }\n\n  if (normal3 == vec3(0.0)) {\n    normal3 = normal;\n  }\n\n  if (normal4 == vec3(0.0)) {\n    normal4 = normal;\n  }\n\n  if(smoothNormals == true) {\n  return (normal + normal1 + normal2 + normal3 + normal4) / 5.0;\n  } else {\nreturn normal;\n  }\n}\n\nvec3 blurNormals(vec2 uv) {\n\n    const float Directions = 4.0; // BLUR DIRECTIONS (Default 16.0 - More is better but slower)\n    const float Quality = 1.0; // BLUR QUALITY (Default 4.0 - More is better but slower)\n    const float Size = 8.0; // BLUR SIZE (Radius)\n    // GAUSSIAN BLUR SETTINGS }}}\n   \n    vec2 Radius = Size/czm_viewport.zw;\n    const float Pi = czm_twoPi;\n    const float PidD = Pi/Directions;\n    // Pixel colour\n    float depth = czm_readDepth(depthTexture, uv);\n    vec3 Color = recNormals(vec3(uv, depth));\n    \n    // Blur calculations\n    for( float d=0.0; d<Pi; d+=PidD)\n    {\n\t\tfor(float i=1.0/Quality; i<=1.0; i+=1.0/Quality)\n        {\n      vec2 newUv = uv+vec2(cos(d),sin(d))*Radius*i;\n      float newDepth = czm_readDepth(depthTexture, newUv);\n\t\t\tColor += recNormals(vec3(newUv, newDepth));\t\t\n        }\n    }\n    \n    // Output to screen\n    Color /= Quality * Directions - 15.0;\n    return Color;\n}\n\nvoid main(void)\n{\n#ifdef CZM_SELECTED_FEATURE\n    if (!czm_selected()) {\n      gl_FragColor = texture2D(colorTexture, v_textureCoordinates);\n      return;\n    }\n#endif\n    if (isEnabled == false) {\n      gl_FragColor = texture2D(colorTexture, v_textureCoordinates);\n      return;\n    }\n    if (viewType == 1) {\n      gl_FragColor = texture2D(colorTexture, v_textureCoordinates);\n    return;\n    }\n    vec4 color;\n    vec4 colAtRef;\n    vec3 normals;\n    float depth1 = czm_readDepth(depthTexture, v_textureCoordinates);\n    vec4 posInCamera = clipToEye(v_textureCoordinates, depth1);\n    vec4 initialPos = depthToView(v_textureCoordinates, depth1); //just vec3 version of posInCamera ig lol\n    if (smoothNormals == true) {\n       normals = blurNormals(v_textureCoordinates);\n    } else {\n       normals = recNormals(vec3(v_textureCoordinates, depth1));\n    }\n    vec2 pixelSize = czm_pixelRatio / czm_viewport.zw;\n    float depthU = czm_readDepth(depthTexture, v_textureCoordinates - vec2(0.0, pixelSize.y));\n    float depthD = czm_readDepth(depthTexture, v_textureCoordinates + vec2(0.0, pixelSize.y));\n    float depthL = czm_readDepth(depthTexture, v_textureCoordinates - vec2(pixelSize.x, 0.0));\n    float depthR = czm_readDepth(depthTexture, v_textureCoordinates + vec2(pixelSize.x, 0.0));\n    vec3 normalInCamera = getNormalXEdge(posInCamera.xyz, depthU, depthD, depthL, depthR, pixelSize);\n    //normalInCamera = 2.0 * normalInCamera - 1.0;\nfloat maxDistance = 8.0;\nfloat resolution  = 0.5;\nint   steps       = 5;\nfloat thickness   = 0.1;\n\nvec4 uv;\nvec2 texSize  = czm_viewport.zw;\nvec2 texCoord = v_textureCoordinates / texSize;\nvec4 positionFrom     = initialPos;\nvec3 unitPositionFrom = normalize(positionFrom.xyz);\nvec3 normal           = normalize(normals);\nvec3 pivot            = normalize(reflect(unitPositionFrom, normal));\n\n\nvec3 diffVec = clamp((unitPositionFrom.xyz - abs(normal)) * 10.0 * (10.0 * depth1), 0.0, 10.0);\nfloat dotP = clamp(-dot(normal, unitPositionFrom) * 10.0 * (4.0 * depth1), 0.0, 10.0);\nfloat diffTest = clamp(1.0 - dot(pivot, unitPositionFrom), 0.0, 1.0);\nvec4 startView = vec4(positionFrom.xyz + (pivot * 0.0), 1.0);\nvec4 endView   = vec4(positionFrom.xyz + (pivot * maxDistance), 1.0);\nfloat distTo = length(startView - endView);\n\n  vec4 startFrag      = startView;\n       // Project to screen space.\n       startFrag      = czm_projection * startFrag;\n       // Perform the perspective divide.\n       startFrag.xyz /= startFrag.w;\n       // Convert the screen-space XY coordinates to UV coordinates.\n       startFrag.xy   = startFrag.xy * 0.5 + 0.5;\n       // Convert the UV coordinates to fragment/pixel coordnates.\n       startFrag.xy  *= texSize;\n\n  vec4 endFrag      = endView;\n       endFrag      = czm_projection * endFrag;\n       endFrag.xyz /= endFrag.w;\n       endFrag.xy   = endFrag.xy * 0.5 + 0.5;\n       endFrag.xy  *= texSize;\n\n  vec2 frag  = startFrag.xy;\n       uv.xy = frag / texSize;\n\n float deltaX    = endFrag.x - startFrag.x;\n  float deltaY    = endFrag.y - startFrag.y;\n float useX      = abs(deltaX) >= abs(deltaY) ? 1.0 : 0.0;\n  float delta     = mix(abs(deltaY), abs(deltaX), useX) * clamp(resolution, 0.0, 1.0);\n\n  vec2  increment = vec2(deltaX, deltaY) / max(delta, 0.001);\n\n\n  float search0 = 0.0;\n  float search1 = 0.0;\n\nfloat currentX = (startFrag.x) * (1.0 - search1) + (endFrag.x) * search1;\nfloat currentY = (startFrag.y) * (1.0 - search1) + (endFrag.y) * search1;\n\n  float hit0 = 0.0;\n  float hit1 = 0.0;\n\n  float viewDistance = startView.z;\n  float depth        = thickness;\n\n  for (int i = 0; i < 10000; ++i) {\n    if (i > int(delta)) {\n      break;\n    }\n    if (depth1 > 0.99) {\n      break;\n    }\n    if (diffTest > 0.9 ) {\n      break;\n\n}\n    frag      += increment;\n    uv.xy      = frag / texSize;\n    vec4 positionTo = clipToEye(uv.xy, uv.z);\n              search1 =\n              mix\n              ((frag.y - startFrag.y) / deltaY\n              ,(frag.x - startFrag.x) / deltaX\n              ,useX\n              );\n        viewDistance = (startView.y * endView.y) / mix(endView.y, startView.y, search1);\n        depth        = viewDistance - positionTo.y;\n\n    if (depth > 0.5 && depth < thickness) {\n      hit0 = 1.0;\n      break;\n    } else {\n      search0 = search1;\n    }\n    search1 = search0 + ((search1 - search0) / 2.0);\n    steps *= int(hit0);\n\n    for (int i = 0; i < 10000; ++i) {\n    if (i > steps) {\n      break;\n    }\n    frag       = mix(startFrag.xy, endFrag.xy, search1);\n    uv.xy      = frag / texSize;\n    positionTo = clipToEye(uv.xy, uv.z);\n    viewDistance = (startView.y * endView.y) / mix(endView.y, startView.y, search1);\n    depth        = viewDistance - positionTo.y;\n    if (depth > 0.0 && depth < thickness) {\n      hit1 = 1.0;\n      search1 = search0 + ((search1 - search0) / 2.0);\n    } else {\n      float temp = search1;\n      search1 = search1 + ((search1 - search0) / 2.0);\n      search0 = temp;\n    }\n    float visibility = hit1 * positionTo.w * ( 1.0 - max(dot(-unitPositionFrom, pivot), 0.0)) * (1.0 - clamp(depth / thickness, 0.0, 1.0)) * (1.0 - clamp(length(positionTo - positionFrom) / maxDistance, 0.0, 1.0)) * (uv.x < 0.0 || uv.x > 1.0 ? 0.0 : 1.0) * (uv.y < 0.0 || uv.y > 1.0 ? 0.0 : 1.0);\n      \n  visibility = clamp(visibility, 0.0, 1.0);\n  uv.ba = vec2(visibility);\n         colAtRef = texture2D(colorTexture, uv.xy);\n        //gl_FragColor = uv; //display uv debug\n          //gl_FragColor = texture2D(colorTexture, uv.xy); //display reflections\n         //gl_FragColor = vec4(1.0) *  diffTest;\n        //gl_FragColor = vec4(normals, 1.0);\n    }\n  }\n  color = texture2D(colorTexture, v_textureCoordinates);\n if (colAtRef.rgb == vec3(0.0)) {\n    gl_FragColor = color;\n  } else {\n  vec4 mix = mix(color, colAtRef, strength);\n  gl_FragColor = mix; //Ref+Col\n  } \n}\n';
    geofs.ssr={},geofs.ssr.isEnabled=!1,geofs.ssr.sNorm=!0,geofs.ssr.strength=1,geofs.ssr.update=function(){geofs.ssr.isEnabled?(geofs.ssr.isEnabled=!1,toggle.setAttribute("class","mdl-switch mdl-js-switch mdl-js-ripple-effect mdl-js-ripple-effect--ignore-events is-upgraded")):(geofs.ssr.isEnabled=!0,toggle.setAttribute("class","mdl-switch mdl-js-switch mdl-js-ripple-effect mdl-js-ripple-effect--ignore-events is-upgraded is-checked"))},geofs.ssr.update1=function(){geofs.ssr.sNorm?(geofs.ssr.sNorm=!1,normals.setAttribute("class","mdl-switch mdl-js-switch mdl-js-ripple-effect mdl-js-ripple-effect--ignore-events is-upgraded")):(geofs.ssr.sNorm=!0,normals.setAttribute("class","mdl-switch mdl-js-switch mdl-js-ripple-effect mdl-js-ripple-effect--ignore-events is-upgraded is-checked"))};let elementSel=document.getElementsByClassName("geofs-preference-list")[0].getElementsByClassName("geofs-advanced")[0].getElementsByClassName("geofs-stopMousePropagation")[0],toggle=document.createElement("label");toggle.setAttribute("class","mdl-switch mdl-js-switch mdl-js-ripple-effect mdl-js-ripple-effect--ignore-events is-upgraded"),toggle.setAttribute("for","ssr"),toggle.setAttribute("id","ssr"),toggle.setAttribute("tabindex","0"),toggle.setAttribute("dataUpgraded",",MaterialSwitch,MaterialRipple"),toggle.innerHTML='<input type="checkbox" id="airports" class="mdl-switch__input" data-gespref="geofs.ssr.isEnabled"><span class="mdl-switch__label">Screen Space Reflections</span>';let normals=document.createElement("label");normals.setAttribute("class","mdl-switch mdl-js-switch mdl-js-ripple-effect mdl-js-ripple-effect--ignore-events is-upgraded"),normals.setAttribute("for","normals"),normals.setAttribute("id","normals"),normals.setAttribute("tabindex","0"),normals.setAttribute("dataUpgraded",",MaterialSwitch,MaterialRipple"),normals.innerHTML='<input type="checkbox" id="airports" class="mdl-switch__input" data-gespref="geofs.ssr.sNorm"><span class="mdl-switch__label">Smooth Normals</span>';let strength=document.createElement("div");function updateStrength(){}strength.setAttribute("class","slider"),strength.setAttribute("data-type","slider"),strength.setAttribute("id","strength"),strength.setAttribute("value","1.0"),strength.setAttribute("data-min","0.0"),strength.setAttribute("data-max","1.0"),strength.setAttribute("data-precision","1.0"),strength.setAttribute("data-gespref","geofs.ssr.a"),strength.setAttribute("data-update","{updateStrength()}"),strength.innerHTML='<div class="slider-rail"><div class="slider-selection" style="width: 100%;"><div class="slider-grippy"><input class="slider-input"></div></div></div><label>Reflection Strength</label>',elementSel.appendChild(toggle),elementSel.appendChild(normals),elementSel.appendChild(strength),toggle.addEventListener("click",geofs.ssr.update),normals.addEventListener("click",geofs.ssr.update1),geofs.fx.rrt={create:function(){geofs.fx.rrt.shader=new Cesium.PostProcessStage({fragmentShader:geofs["rrt.glsl"],uniforms:{reflectionMap:"/shaders/reflection.jpg",intensity:3,bias:.1,lengthCap:.26,stepSize:1.95,frustumLength:1e3,viewType:geofs.camera.currentMode,isEnabled:geofs.ssr.isEnabled,smoothNormals:geofs.ssr.sNorm,strength:1}}),geofs.fx.rrt.shader.selected=[geofs.aircraft.instance.object3d.model._model],geofs.api.viewer.scene.postProcessStages.add(geofs.fx.rrt.shader)},update:function(){geofs.fx.rrt.shader.uniforms.viewType=geofs.camera.currentMode,geofs.fx.rrt.shader.uniforms.isEnabled=geofs.ssr.isEnabled,geofs.fx.rrt.shader.uniforms.smoothNormals=geofs.ssr.sNorm,geofs.fx.rrt.shader.uniforms.strength=geofs.ssr.strength,geofs.fx.rrt.shader.selected=[geofs.aircraft.instance.object3d.model._model]}},geofs.fx.rrt.create(),setInterval(function(){geofs.fx.rrt.update()},100),geofs.setPreferenceFromInput=function(a){try{var c=a.getAttribute("data-gespref");if(c){var g=a.getAttribute("data-type")||a.getAttribute("type");"SELECT"==a.nodeName&&(g="select"),g=g.toLowerCase();var e=c.split(".");c=window;for(var d=0;d<e.length-1;d++)c=c[e[d]];switch(g){case"radio-button":$(a).is(".is-checked")&&(c[e[d]]=a.getAttribute("data-matchvalue"));break;case"checkbox":var f=a.getAttribute("data-matchvalue"),b=a.checked;f?b&&(c[e[d]]=f):c[e[d]]=b;break;case"radio":f=a.getAttribute("data-matchvalue"),b=a.checked,f?b&&(b=c[e[d]]=f):c[e[d]]=b;break;case"slider":b=parseFloat($(a).slider("value")),"strength"===$(a)[0].id&&(geofs.ssr.strength=b),c[e[d]]=b;break;case"keydetect":b=a.value,c[e[d]].keycode=parseInt(a.getAttribute("keycode")),c[e[d]].label=b;break;default:b=a.value,c[e[d]]=b}var h=a.getAttribute("data-update");if(h){var i=new Function("value",h);try{i.call(a,b)}catch(j){geofs.debug.error(j,"setPreferenceFromInput updateFunction.call")}}}}catch(k){geofs.debug.error(k,"geofs.setPreferenceFromInput")}}
    function init() {
        // Example: Screen-Space Reflection Shader
        console.log('');
        // Additional code for  enhancements
        console.log('https://github.com/Ariakim-Taiyo/GeoFS-Shaders-Repository/blob/main/SSR/SSR.md ; link to description of SSR');
    }
    init();
})();
// == Screen-Space Reflection Shader ==

// == GeoFS-Flight-Path-Vector ==
(function() {
    // GeoFS-Flight-Path-Vector initialization code
    // ==UserScript==
// @name         GeoFS Flight Path Vector
// @version      1.0
// @description  Displays a Flight Path Vector on the screen
// @author       GGamerGGuy
// @match        https://www.geo-fs.com/geofs.php?v=*
// @match        https://*.geo-fs.com/geofs.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geo-fs.com
// @grant        none
// ==/UserScript==

// Notes
// Pressing 'l' will hide the FPV
// The FPV is calculated based on the camera's position. This means that the FPV shows where the camera would hit the ground if it were to keep going in the same direction, and not the aircraft.
function cF(x, y, z) {
    return { x, y, z };
}
function waitForEntities() {
    try {
        if (geofs.api) {
            // Entities are already defined, no need to wait
            main();
            return;
        }
    } catch (error) {
        // Handle any errors (e.g., log them)
        console.log('Error in waitForEntities:', error);
    }
    // Retry after 1000 milliseconds
    setTimeout(waitForEntities, 1000);
}
window.lastLoc;
window.onload = setTimeout(waitForEntities, 10000);
window.howFar = 15; //                                THIS DETERMINES HOW FAR AWAY THE DOT IS. IT IS A FACTOR, AND THE ACTUAL DISTANCE IS DIRECTLY RELATED TO THE TRUE AIRSPEED.
function main() {
    (function() {
        'use strict';
        window.y = geofs.api.viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(geofs.camera.lla[1], geofs.camera.lla[0], (geofs.animation.values.groundElevationFeet/3.2808399)),
            billboard: {
                image: "https://tylerbmusic.github.io/GPWS-files_geofs/FPV.png",
                scale: 0.03 * (1/geofs.api.renderingSettings.resolutionScale),
            },
        });
        if (geofs.api.renderingSettings.resolutionScale <= 0.6) {
                    window.y.billboard.image = 'https://tylerbmusic.github.io/GPWS-files_geofs/FPV_Lowres.png';
                }
        window.lastLoc = Cesium.Cartesian3.fromDegrees(geofs.camera.lla[1], geofs.camera.lla[0], geofs.camera.lla[2]);
        // Update display
        function updateFlightDataDisplay() {
            // Check if geofs.animation.values is available
            if (geofs.animation.values && !geofs.isPaused()) {
                if (window.currLoc) {
                    window.lastLoc = window.currLoc;
                }
                window.currLoc = Cesium.Cartesian3.fromDegrees(geofs.camera.lla[1], geofs.camera.lla[0], geofs.camera.lla[2]);
                window.deltaLoc = [(window.currLoc.x-window.lastLoc.x), (window.currLoc.y-window.lastLoc.y), (window.currLoc.z-window.lastLoc.z)];
                // Retrieve and format the required values
                var agl = (geofs.animation.values.altitude !== undefined && geofs.animation.values.groundElevationFeet !== undefined) ? Math.round((geofs.animation.values.altitude - geofs.animation.values.groundElevationFeet) + (geofs.aircraft.instance.collisionPoints[geofs.aircraft.instance.collisionPoints.length - 2].worldPosition[2]*3.2808399)) : 'N/A';
                var glideslope;
                if (geofs.animation.getValue("NAV1Direction") && (geofs.animation.getValue("NAV1Distance") !== 600)) { //The second part to the if statement prevents the divide by 0 error.
                    glideslope = (geofs.animation.getValue("NAV1Direction") === "to") ? (Math.atan((agl*0.3048) / (geofs.animation.getValue("NAV1Distance")+600))*RAD_TO_DEGREES).toFixed(1) : (Math.atan((agl*0.3048) / Math.abs(geofs.animation.getValue("NAV1Distance")-600))*RAD_TO_DEGREES).toFixed(1); //The center of the aiming point is exactly 600 meters from the start of the runway (in GeoFS).
                } else {
                    glideslope = 'N/A';
                }
                if (!geofs.aircraft.instance.groundContact && !(window.deltaLoc[0]+window.deltaLoc[1]+window.deltaLoc[2] == 0)) {
                    window.y.position = cF(window.currLoc.x+(window.howFar*window.deltaLoc[0]), (window.currLoc.y+(window.howFar*window.deltaLoc[1])), (window.currLoc.z+(window.howFar*window.deltaLoc[2])));
                }

                // Display css
                var flightDataElement = document.getElementById('flightDataDisplay0');
                if (!flightDataElement) {
                    flightDataElement = document.createElement('div');
                    flightDataElement.id = 'flightDataDisplay0';
                    flightDataElement.style.position = 'fixed';
                    flightDataElement.style.bottom = '0';
                    flightDataElement.style.right = 'calc(10px + 48px + 16px)';
                    flightDataElement.style.height = '36px';
                    flightDataElement.style.minWidth = '64px';
                    flightDataElement.style.padding = '0 16px';
                    flightDataElement.style.display = 'inline-block';
                    flightDataElement.style.fontFamily = '"Roboto", "Helvetica", "Arial", sans-serif';
                    flightDataElement.style.fontSize = '14px';
                    flightDataElement.style.textTransform = 'uppercase';
                    flightDataElement.style.overflow = 'hidden';
                    flightDataElement.style.willChange = 'box-shadow';
                    flightDataElement.style.transition = 'box-shadow .2s cubic-bezier(.4,0,1,1), background-color .2s cubic-bezier(.4,0,.2,1), color .2s cubic-bezier(.4,0,.2,1)';
                    flightDataElement.style.textAlign = 'center';
                    flightDataElement.style.lineHeight = '36px';
                    flightDataElement.style.verticalAlign = 'middle';
                    flightDataElement.style.zIndex = '9999';
                    document.body.appendChild(flightDataElement);
                }

                flightDataElement.innerHTML = `
                <span style="background: 0 0; border: none; border-radius: 2px; color: #000; display: inline-block; padding: 0 8px;">Glideslope ${glideslope}</span>
            `;
            }
        }

        // Update flight data display every 100ms
        setInterval(updateFlightDataDisplay, (geofs.debug.fps ? (1/(Number(geofs.debug.fps)))+5 : 100)); //The +5 gives a buffer and the : 100 is an attempt to prevent a huge lag spike on touchdown that I was encountering.
        document.addEventListener('keydown', function(event) {
                if (event.key === 'l') {
                    window.y.show = !window.y.show;
                }
        });
    })();
}
    function init() {
        // Example: Display flight path vector
        console.log('GeoFS-Flight-Path-Vector Initialized');
        // Additional code for  enhancements
    }
    init();
})();
// == GeoFS-Flight-Path-Vector ==

// ==()==
(function() {
    // () initialization code
    function init() {
        // Example: Enhance  features
        console.log('');
        // Additional code for  enhancements
    }
    init();
})();
// ==/( )==

console.log('Everything loaded successfully!');
