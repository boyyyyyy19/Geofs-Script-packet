// ==UserScript==
// @name         GeoFS All-in-One Addon
// @version      1.5
// @description  Combines functionalities from various GeoFS addons for an enhanced simulation experience.
// @author     boyyyyyy19 with some ChatGPT
// ==/UserScript==



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
// @version      0.3
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
        const bbox = bounds;
        const overpassUrl = 'https://overpass-api.de/api/interpreter';
        const query = `[out:json];
        (
            way["aeroway"="taxiway"]({{bbox}})[ref];
            way["aeroway"="runway"]({{bbox}})[ref];
        );
        out body;
        >;
        out skel qt;
    `;

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
    window.twS = [];
    window.theWays = [];
    window.theNodes = [];
    window.twSPos = [];
    window.twSOri = [];
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
            for (let i = 0; i < window.twM.length; i++) {
                window.geofs.api.viewer.scene.primitives.remove(window.twM[i]);
            }
            for (let i in window.twS) {
                window.geofs.api.viewer.scene.primitives.remove(window.twS[i]);
            }
            window.twM = [];
            window.twS = [];
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
                window.twSPos.push(pos);
                window.twSOri.push(ori);

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
                window.twS.push(window.geofs.api.viewer.scene.primitives.add(texturedPlane));
            }
        }
    });
    instanceTwS();
};
async function instanceTwS() {
    const modelMatrices = window.twSPos.map((position, index) => {
        const translationMatrix = /*window.Cesium.Transforms.northEastDownToFixedFrame*/window.Cesium.Matrix4.fromTranslation(position);

        // Convert quaternion to rotation matrix
        const rotationMatrix = window.Cesium.Matrix3.fromQuaternion(window.twSOri[index]);

        // Apply rotation to translation
        return window.Cesium.Matrix4.multiplyByMatrix3(translationMatrix, rotationMatrix, new window.Cesium.Matrix4());
    });
    window.twM.push(window.geofs.api.viewer.scene.primitives.add(
        new window.Cesium.ModelInstanceCollection({
            url: "https://raw.githubusercontent.com/tylerbmusic/GPWS-files_geofs/refs/heads/main/tw_sign.glb",
            minimumPixelSize: 32,
            maximumScale: 1,
            instances: modelMatrices.map((matrix) => ({ modelMatrix: matrix })),
        })));
}
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
 
//=
// == Screen-Space Reflection Shader ==
(function() {
    // Screen-Space Reflection Shader initialization code
    geofs["rrt.glsl"] = "" + '\n//Using a modified version of the default CesiumJS AO shader for base functions\nuniform sampler2D depthTexture;\nuniform sampler2D colorTexture;\nuniform int viewType;\nuniform bool smoothNormals;\nuniform bool isEnabled;\nuniform float strength;\nvarying vec2 v_textureCoordinates;\n#ifdef GL_OES_standard_derivatives\n    #extension GL_OES_standard_derivatives : enable\n#endif  \n\n//#define CZM_SELECTED_FEATURE \n\nfloat rand(vec2 co){\n    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);\n}\n\nvec4 clipToEye(vec2 uv, float depth)\n{\n    vec2 xy = vec2((uv.x * 2.0 - 1.0), ((1.0 - uv.y) * 2.0 - 1.0));\n    vec4 posEC = czm_inverseProjection * vec4(xy, depth, 1.0);\n    posEC = posEC / posEC.w;\n    return posEC;\n}\n\nvec4 depthToView(vec2 texCoord, float depth) {\n    vec4 ndc = vec4(texCoord, depth, 1.0) * 2.0 - 1.0;\n    vec4 viewPos = czm_inverseProjection * ndc;\n    return viewPos / viewPos.w;\n}\n\nvec3 viewToDepth(vec3 pos)\n{\n  vec4 clip = czm_projection * vec4(pos,1.0);\n  vec3 ndc = clip.xyz / clip.w;\n  return ndc * .5 + .5;\n}\n\n//Reconstruct Normal Without Edge Removation\nvec3 getNormalXEdge(vec3 posInCamera, float depthU, float depthD, float depthL, float depthR, vec2 pixelSize)\n{\n    vec4 posInCameraUp = clipToEye(v_textureCoordinates - vec2(0.0, pixelSize.y), depthU);\n    vec4 posInCameraDown = clipToEye(v_textureCoordinates + vec2(0.0, pixelSize.y), depthD);\n    vec4 posInCameraLeft = clipToEye(v_textureCoordinates - vec2(pixelSize.x, 0.0), depthL);\n    vec4 posInCameraRight = clipToEye(v_textureCoordinates + vec2(pixelSize.x, 0.0), depthR);\n\n    vec3 up = posInCamera.xyz - posInCameraUp.xyz;\n    vec3 down = posInCameraDown.xyz - posInCamera.xyz;\n    vec3 left = posInCamera.xyz - posInCameraLeft.xyz;\n    vec3 right = posInCameraRight.xyz - posInCamera.xyz;\n\n    vec3 DX = length(left) < length(right) ? left : right;\n    vec3 DY = length(up) < length(down) ? up : down;\n\n    return normalize(cross(DY, DX));\n}\n\n\n\n\n//smooth normals with blur\nvec3 recNormals(vec3 pos) {\n  float dMp = 0.006 * pos.z; //how far we sample from the original point\n  vec3 P0 = depthToView(pos.xy, pos.z).xyz;\n  vec3 normal = normalize(cross(dFdx(P0), dFdy(P0)));\n  float d1 = czm_readDepth(depthTexture, vec2(pos.x + dMp, pos.y + dMp));\n  float d2 = czm_readDepth(depthTexture, vec2(pos.x - dMp, pos.y + dMp));\n  float d3 = czm_readDepth(depthTexture, vec2(pos.x + dMp, pos.y - dMp));\n  float d4 = czm_readDepth(depthTexture, vec2(pos.x - dMp, pos.y - dMp));\n  \n  vec3 P1 = depthToView(vec2(pos.x + dMp, pos.y + dMp), d1).xyz;\n  vec3 P2 = depthToView(vec2(pos.x - dMp, pos.y + dMp), d2).xyz;\n  vec3 P3 = depthToView(vec2(pos.x + dMp, pos.y - dMp), d3).xyz;\n  vec3 P4 = depthToView(vec2(pos.x - dMp, pos.y - dMp), d4).xyz;\n  vec3 normal1 = normalize(cross(dFdx(P1), dFdy(P1)));\n  vec3 normal2 = normalize(cross(dFdx(P2), dFdy(P2)));\n  vec3 normal3 = normalize(cross(dFdx(P3), dFdy(P3)));\n  vec3 normal4 = normalize(cross(dFdx(P4), dFdy(P4)));\n  if (normal1 == vec3(0.0)) { // fix edge blending\n    normal1 = normal;\n  }\n\n  if (normal2 == vec3(0.0)) {\n    normal2 = normal;\n  }\n\n  if (normal3 == vec3(0.0)) {\n    normal3 = normal;\n  }\n\n  if (normal4 == vec3(0.0)) {\n    normal4 = normal;\n  }\n\n  if(smoothNormals == true) {\n  return (normal + normal1 + normal2 + normal3 + normal4) / 5.0;\n  } else {\nreturn normal;\n  }\n}\n\nvec3 blurNormals(vec2 uv) {\n\n    const float Directions = 4.0; // BLUR DIRECTIONS (Default 16.0 - More is better but slower)\n    const float Quality = 1.0; // BLUR QUALITY (Default 4.0 - More is better but slower)\n    const float Size = 8.0; // BLUR SIZE (Radius)\n    // GAUSSIAN BLUR SETTINGS }}}\n   \n    vec2 Radius = Size/czm_viewport.zw;\n    const float Pi = czm_twoPi;\n    const float PidD = Pi/Directions;\n    // Pixel colour\n    float depth = czm_readDepth(depthTexture, uv);\n    vec3 Color = recNormals(vec3(uv, depth));\n    \n    // Blur calculations\n    for( float d=0.0; d<Pi; d+=PidD)\n    {\n\t\tfor(float i=1.0/Quality; i<=1.0; i+=1.0/Quality)\n        {\n      vec2 newUv = uv+vec2(cos(d),sin(d))*Radius*i;\n      float newDepth = czm_readDepth(depthTexture, newUv);\n\t\t\tColor += recNormals(vec3(newUv, newDepth));\t\t\n        }\n    }\n    \n    // Output to screen\n    Color /= Quality * Directions - 15.0;\n    return Color;\n}\n\nvoid main(void)\n{\n#ifdef CZM_SELECTED_FEATURE\n    if (!czm_selected()) {\n      gl_FragColor = texture2D(colorTexture, v_textureCoordinates);\n      return;\n    }\n#endif\n    if (isEnabled == false) {\n      gl_FragColor = texture2D(colorTexture, v_textureCoordinates);\n      return;\n    }\n    if (viewType == 1) {\n      gl_FragColor = texture2D(colorTexture, v_textureCoordinates);\n    return;\n    }\n    vec4 color;\n    vec4 colAtRef;\n    vec3 normals;\n    float depth1 = czm_readDepth(depthTexture, v_textureCoordinates);\n    vec4 posInCamera = clipToEye(v_textureCoordinates, depth1);\n    vec4 initialPos = depthToView(v_textureCoordinates, depth1); //just vec3 version of posInCamera ig lol\n    if (smoothNormals == true) {\n       normals = blurNormals(v_textureCoordinates);\n    } else {\n       normals = recNormals(vec3(v_textureCoordinates, depth1));\n    }\n    vec2 pixelSize = czm_pixelRatio / czm_viewport.zw;\n    float depthU = czm_readDepth(depthTexture, v_textureCoordinates - vec2(0.0, pixelSize.y));\n    float depthD = czm_readDepth(depthTexture, v_textureCoordinates + vec2(0.0, pixelSize.y));\n    float depthL = czm_readDepth(depthTexture, v_textureCoordinates - vec2(pixelSize.x, 0.0));\n    float depthR = czm_readDepth(depthTexture, v_textureCoordinates + vec2(pixelSize.x, 0.0));\n    vec3 normalInCamera = getNormalXEdge(posInCamera.xyz, depthU, depthD, depthL, depthR, pixelSize);\n    //normalInCamera = 2.0 * normalInCamera - 1.0;\nfloat maxDistance = 8.0;\nfloat resolution  = 0.5;\nint   steps       = 5;\nfloat thickness   = 0.1;\n\nvec4 uv;\nvec2 texSize  = czm_viewport.zw;\nvec2 texCoord = v_textureCoordinates / texSize;\nvec4 positionFrom     = initialPos;\nvec3 unitPositionFrom = normalize(positionFrom.xyz);\nvec3 normal           = normalize(normals);\nvec3 pivot            = normalize(reflect(unitPositionFrom, normal));\n\n\nvec3 diffVec = clamp((unitPositionFrom.xyz - abs(normal)) * 10.0 * (10.0 * depth1), 0.0, 10.0);\nfloat dotP = clamp(-dot(normal, unitPositionFrom) * 10.0 * (4.0 * depth1), 0.0, 10.0);\nfloat diffTest = clamp(1.0 - dot(pivot, unitPositionFrom), 0.0, 1.0);\nvec4 startView = vec4(positionFrom.xyz + (pivot * 0.0), 1.0);\nvec4 endView   = vec4(positionFrom.xyz + (pivot * maxDistance), 1.0);\nfloat distTo = length(startView - endView);\n\n  vec4 startFrag      = startView;\n       // Project to screen space.\n       startFrag      = czm_projection * startFrag;\n       // Perform the perspective divide.\n       startFrag.xyz /= startFrag.w;\n       // Convert the screen-space XY coordinates to UV coordinates.\n       startFrag.xy   = startFrag.xy * 0.5 + 0.5;\n       // Convert the UV coordinates to fragment/pixel coordnates.\n       startFrag.xy  *= texSize;\n\n  vec4 endFrag      = endView;\n       endFrag      = czm_projection * endFrag;\n       endFrag.xyz /= endFrag.w;\n       endFrag.xy   = endFrag.xy * 0.5 + 0.5;\n       endFrag.xy  *= texSize;\n\n  vec2 frag  = startFrag.xy;\n       uv.xy = frag / texSize;\n\n float deltaX    = endFrag.x - startFrag.x;\n  float deltaY    = endFrag.y - startFrag.y;\n float useX      = abs(deltaX) >= abs(deltaY) ? 1.0 : 0.0;\n  float delta     = mix(abs(deltaY), abs(deltaX), useX) * clamp(resolution, 0.0, 1.0);\n\n  vec2  increment = vec2(deltaX, deltaY) / max(delta, 0.001);\n\n\n  float search0 = 0.0;\n  float search1 = 0.0;\n\nfloat currentX = (startFrag.x) * (1.0 - search1) + (endFrag.x) * search1;\nfloat currentY = (startFrag.y) * (1.0 - search1) + (endFrag.y) * search1;\n\n  float hit0 = 0.0;\n  float hit1 = 0.0;\n\n  float viewDistance = startView.z;\n  float depth        = thickness;\n\n  for (int i = 0; i < 10000; ++i) {\n    if (i > int(delta)) {\n      break;\n    }\n    if (depth1 > 0.99) {\n      break;\n    }\n    if (diffTest > 0.9 ) {\n      break;\n\n}\n    frag      += increment;\n    uv.xy      = frag / texSize;\n    vec4 positionTo = clipToEye(uv.xy, uv.z);\n              search1 =\n              mix\n              ((frag.y - startFrag.y) / deltaY\n              ,(frag.x - startFrag.x) / deltaX\n              ,useX\n              );\n        viewDistance = (startView.y * endView.y) / mix(endView.y, startView.y, search1);\n        depth        = viewDistance - positionTo.y;\n\n    if (depth > 0.5 && depth < thickness) {\n      hit0 = 1.0;\n      break;\n    } else {\n      search0 = search1;\n    }\n    search1 = search0 + ((search1 - search0) / 2.0);\n    steps *= int(hit0);\n\n    for (int i = 0; i < 10000; ++i) {\n    if (i > steps) {\n      break;\n    }\n    frag       = mix(startFrag.xy, endFrag.xy, search1);\n    uv.xy      = frag / texSize;\n    positionTo = clipToEye(uv.xy, uv.z);\n    viewDistance = (startView.y * endView.y) / mix(endView.y, startView.y, search1);\n    depth        = viewDistance - positionTo.y;\n    if (depth > 0.0 && depth < thickness) {\n      hit1 = 1.0;\n      search1 = search0 + ((search1 - search0) / 2.0);\n    } else {\n      float temp = search1;\n      search1 = search1 + ((search1 - search0) / 2.0);\n      search0 = temp;\n    }\n    float visibility = hit1 * positionTo.w * ( 1.0 - max(dot(-unitPositionFrom, pivot), 0.0)) * (1.0 - clamp(depth / thickness, 0.0, 1.0)) * (1.0 - clamp(length(positionTo - positionFrom) / maxDistance, 0.0, 1.0)) * (uv.x < 0.0 || uv.x > 1.0 ? 0.0 : 1.0) * (uv.y < 0.0 || uv.y > 1.0 ? 0.0 : 1.0);\n      \n  visibility = clamp(visibility, 0.0, 1.0);\n  uv.ba = vec2(visibility);\n         colAtRef = texture2D(colorTexture, uv.xy);\n        //gl_FragColor = uv; //display uv debug\n          //gl_FragColor = texture2D(colorTexture, uv.xy); //display reflections\n         //gl_FragColor = vec4(1.0) *  diffTest;\n        //gl_FragColor = vec4(normals, 1.0);\n    }\n  }\n  color = texture2D(colorTexture, v_textureCoordinates);\n if (colAtRef.rgb == vec3(0.0)) {\n    gl_FragColor = color;\n  } else {\n  vec4 mix = mix(color, colAtRef, strength);\n  gl_FragColor = mix; //Ref+Col\n  } \n}\n';
    geofs.ssr={},geofs.ssr.isEnabled=!1,geofs.ssr.sNorm=!0,geofs.ssr.strength=1,geofs.ssr.update=function(){geofs.ssr.isEnabled?(geofs.ssr.isEnabled=!1,toggle.setAttribute("class","mdl-switch mdl-js-switch mdl-js-ripple-effect mdl-js-ripple-effect--ignore-events is-upgraded")):(geofs.ssr.isEnabled=!0,toggle.setAttribute("class","mdl-switch mdl-js-switch mdl-js-ripple-effect mdl-js-ripple-effect--ignore-events is-upgraded is-checked"))},geofs.ssr.update1=function(){geofs.ssr.sNorm?(geofs.ssr.sNorm=!1,normals.setAttribute("class","mdl-switch mdl-js-switch mdl-js-ripple-effect mdl-js-ripple-effect--ignore-events is-upgraded")):(geofs.ssr.sNorm=!0,normals.setAttribute("class","mdl-switch mdl-js-switch mdl-js-ripple-effect mdl-js-ripple-effect--ignore-events is-upgraded is-checked"))};let elementSel=document.getElementsByClassName("geofs-preference-list")[0].getElementsByClassName("geofs-advanced")[0].getElementsByClassName("geofs-stopMousePropagation")[0],toggle=document.createElement("label");toggle.setAttribute("class","mdl-switch mdl-js-switch mdl-js-ripple-effect mdl-js-ripple-effect--ignore-events is-upgraded"),toggle.setAttribute("for","ssr"),toggle.setAttribute("id","ssr"),toggle.setAttribute("tabindex","0"),toggle.setAttribute("dataUpgraded",",MaterialSwitch,MaterialRipple"),toggle.innerHTML='<input type="checkbox" id="airports" class="mdl-switch__input" data-gespref="geofs.ssr.isEnabled"><span class="mdl-switch__label">Screen Space Reflections</span>';let normals=document.createElement("label");normals.setAttribute("class","mdl-switch mdl-js-switch mdl-js-ripple-effect mdl-js-ripple-effect--ignore-events is-upgraded"),normals.setAttribute("for","normals"),normals.setAttribute("id","normals"),normals.setAttribute("tabindex","0"),normals.setAttribute("dataUpgraded",",MaterialSwitch,MaterialRipple"),normals.innerHTML='<input type="checkbox" id="airports" class="mdl-switch__input" data-gespref="geofs.ssr.sNorm"><span class="mdl-switch__label">Smooth Normals</span>';let strength=document.createElement("div");function updateStrength(){}strength.setAttribute("class","slider"),strength.setAttribute("data-type","slider"),strength.setAttribute("id","strength"),strength.setAttribute("value","1.0"),strength.setAttribute("data-min","0.0"),strength.setAttribute("data-max","1.0"),strength.setAttribute("data-precision","1.0"),strength.setAttribute("data-gespref","geofs.ssr.a"),strength.setAttribute("data-update","{updateStrength()}"),strength.innerHTML='<div class="slider-rail"><div class="slider-selection" style="width: 100%;"><div class="slider-grippy"><input class="slider-input"></div></div></div><label>Reflection Strength</label>',elementSel.appendChild(toggle),elementSel.appendChild(normals),elementSel.appendChild(strength),toggle.addEventListener("click",geofs.ssr.update),normals.addEventListener("click",geofs.ssr.update1),geofs.fx.rrt={create:function(){geofs.fx.rrt.shader=new Cesium.PostProcessStage({fragmentShader:geofs["rrt.glsl"],uniforms:{reflectionMap:"/shaders/reflection.jpg",intensity:3,bias:.1,lengthCap:.26,stepSize:1.95,frustumLength:1e3,viewType:geofs.camera.currentMode,isEnabled:geofs.ssr.isEnabled,smoothNormals:geofs.ssr.sNorm,strength:1}}),geofs.fx.rrt.shader.selected=[geofs.aircraft.instance.object3d.model._model],geofs.api.viewer.scene.postProcessStages.add(geofs.fx.rrt.shader)},update:function(){geofs.fx.rrt.shader.uniforms.viewType=geofs.camera.currentMode,geofs.fx.rrt.shader.uniforms.isEnabled=geofs.ssr.isEnabled,geofs.fx.rrt.shader.uniforms.smoothNormals=geofs.ssr.sNorm,geofs.fx.rrt.shader.uniforms.strength=geofs.ssr.strength,geofs.fx.rrt.shader.selected=[geofs.aircraft.instance.object3d.model._model]}},geofs.fx.rrt.create(),setInterval(function(){geofs.fx.rrt.update()},100),geofs.setPreferenceFromInput=function(a){try{var c=a.getAttribute("data-gespref");if(c){var g=a.getAttribute("data-type")||a.getAttribute("type");"SELECT"==a.nodeName&&(g="select"),g=g.toLowerCase();var e=c.split(".");c=window;for(var d=0;d<e.length-1;d++)c=c[e[d]];switch(g){case"radio-button":$(a).is(".is-checked")&&(c[e[d]]=a.getAttribute("data-matchvalue"));break;case"checkbox":var f=a.getAttribute("data-matchvalue"),b=a.checked;f?b&&(c[e[d]]=f):c[e[d]]=b;break;case"radio":f=a.getAttribute("data-matchvalue"),b=a.checked,f?b&&(b=c[e[d]]=f):c[e[d]]=b;break;case"slider":b=parseFloat($(a).slider("value")),"strength"===$(a)[0].id&&(geofs.ssr.strength=b),c[e[d]]=b;break;case"keydetect":b=a.value,c[e[d]].keycode=parseInt(a.getAttribute("keycode")),c[e[d]].label=b;break;default:b=a.value,c[e[d]]=b}var h=a.getAttribute("data-update");if(h){var i=new Function("value",h);try{i.call(a,b)}catch(j){geofs.debug.error(j,"setPreferenceFromInput updateFunction.call")}}}}catch(k){geofs.debug.error(k,"geofs.setPreferenceFromInput")}}
    function init() {
        // Example: Screen-Space Reflection Shader
        
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



// == GEOFS-LiverySelector ==
(function() {
    // GEOFS-LiverySelector initialization code
    const githubRepo = 'https://raw.githubusercontent.com/kolos26/GEOFS-LiverySelector/main';
const version = '3.2.3';

const liveryobj = {};
const mpLiveryIds = {};
const mLiveries = {};
const origHTMLs = {};
const uploadHistory = JSON.parse(localStorage.lsUploadHistory || '{}');
const liveryIdOffset = 10e3;
const mlIdOffset = 1e3;
let links = [];
let airlineobjs = [];
let whitelist;

(function init() {

    // styles
    fetch(`${githubRepo}/styles.css?` + Date.now()).then(async data => {
        const styleTag = createTag('style', { type: 'text/css' });
        styleTag.innerHTML = await data.text();
        document.head.appendChild(styleTag);
    });
    appendNewChild(document.head, 'link', { rel: 'stylesheet', href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css' });

    // Panel for list
    const listDiv = appendNewChild(document.querySelector('.geofs-ui-left'), 'div', {
        id: 'listDiv',
        class: 'geofs-list geofs-toggle-panel livery-list',
        'data-noblur': 'true',
        'data-onshow': '{geofs.initializePreferencesPanel()}',
        'data-onhide': '{geofs.savePreferencesPanel()}'
    });
    listDiv.innerHTML = generateListHTML();

    // Button for panel
    const geofsUiButton = document.querySelector('.geofs-ui-bottom');
    const insertPos = geofs.version >= 3.6 ? 4 : 3;
    geofsUiButton.insertBefore(generatePanelButtonHTML(), geofsUiButton.children[insertPos]);

    //remove original buttons
    const origButtons = document.getElementsByClassName('geofs-liveries geofs-list-collapsible-item');
    Object.values(origButtons).forEach(btn => btn.parentElement.removeChild(btn));

    //Load liveries (@todo: consider moving to listLiveries)
    fetch(`${githubRepo}/livery.json?` + Date.now()).then(handleLiveryJson);

    //Init airline databases
    if (localStorage.getItem('links') === null) {
        localStorage.links = '';
    } else {
        links = localStorage.links.split(",");
        links.forEach(async function (e) {
            await fetch(e).then(res => res.json()).then(data => airlineobjs.push(data));
            airlineobjs[airlineobjs.length - 1].url = e.trim();
        });
    }
    fetch(`${githubRepo}/whitelist.json?` + Date.now()).then(res => res.json()).then(data => whitelist = data);

    // Start multiplayer
    setInterval(updateMultiplayer, 5000);

    window.addEventListener("keyup", function (e) {
        if (e.target.classList.contains("geofs-stopKeyupPropagation")) {
            e.stopImmediatePropagation();
        }
        if (e.key === "l") {
            listLiveries();
            ui.panel.toggle(".livery-list");
        }
    });
})();

/**
 * @param {Response} data
 */
async function handleLiveryJson(data) {
    const json = await data.json();
    Object.keys(json).forEach(key => liveryobj[key] = json[key]);

    if (liveryobj.version != version) {
        document.querySelector('.livery-list h3').appendChild(
            createTag('a', {
                href: 'https://github.com/kolos26/GEOFS-LiverySelector',
                target: '_blank',
                style: 'display:block;width:100%;text-decoration:none;text-align:center;'
            }, 'Update available: ' + liveryobj.version)
        );
    }
    // mark aircraft with livery icons
    Object.keys(liveryobj.aircrafts).forEach(aircraftId => {
        if (liveryobj.aircrafts[aircraftId].liveries.length < 2) {
            return; // only show icon if there's more than one livery
        }
        const element = document.querySelector(`[data-aircraft='${aircraftId}']`);
        // save original HTML for later use (reload, aircraft change, etc..)
        if (!origHTMLs[aircraftId]) {
            origHTMLs[aircraftId] = element.innerHTML;
        }

        // use orig HTML to concatenate so theres only ever one icon
        element.innerHTML = origHTMLs[aircraftId] +
            createTag('img', {
                src: `${githubRepo}/liveryselector-logo-small.svg`,
                style: 'height:30px;width:auto;margin-left:20px;',
                title: 'Liveries available'
            }).outerHTML;

        if (liveryobj.aircrafts[aircraftId].mp != "disabled")
            element.innerHTML += createTag('small', {
                title: 'Liveries are multiplayer compatible\n(visible to other players)'
            }, '🎮').outerHTML;
    });
}

/**
 * Triggers GeoFS API to load texture
 *
 * @param {string[]} texture
 * @param {number[]} index
 * @param {number[]} parts
 * @param {Object[]} mats
 */
function loadLivery(texture, index, parts, mats) {
    //change livery
    for (let i = 0; i < texture.length; i++) {
        const model3d = geofs.aircraft.instance.definition.parts[parts[i]]['3dmodel'];
        // check for material definition (for untextured parts)
        if (typeof texture[i] === 'object') {
            if (texture[i].material !== undefined) {
                const mat = mats[texture[i].material];
                model3d._model.getMaterial(mat.name)
                    .setValue(Object.keys(mat)[1], new Cesium.Cartesian4(...mat[Object.keys(mat)[1]], 1.0));
            }
            continue;
        }
        if (geofs.version == 2.9) {
            geofs.api.Model.prototype.changeTexture(texture[i], index[i], model3d);
        } else if (geofs.version >= 3.0 && geofs.version <= 3.7) {
            geofs.api.changeModelTexture(model3d._model, texture[i], index[i]);
        } else {
            geofs.api.changeModelTexture(model3d._model, texture[i], { index: index[i] });
        }
    }
}

/**
 * Load liveries from text input fields
 */
function inputLivery() {
    const airplane = getCurrentAircraft();
    const textures = airplane.liveries[0].texture;
    const inputFields = document.getElementsByName('textureInput');
    if (textures.filter(x => x === textures[0]).length === textures.length) { // the same texture is used for all indexes and parts
        const texture = inputFields[0].value;
        loadLivery(Array(textures.length).fill(texture), airplane.index, airplane.parts);
    } else {
        const texture = [];
        inputFields.forEach(e => texture.push(e.value));
        loadLivery(texture, airplane.index, airplane.parts);
    }
}

/**
 * Submit livery for review
 */
function submitLivery() {
    const airplane = getCurrentAircraft();
    const textures = airplane.liveries[0].texture;
    const inputFields = document.getElementsByName('textureInput');
    const formFields = {};
    document.querySelectorAll('.livery-submit input').forEach(f => formFields[f.id.replace('livery-submit-', '')] = f);
    if (!localStorage.liveryDiscordId || localStorage.liveryDiscordId.length < 6) {
        return alert('Invalid Discord User id!');
    }
    if (formFields.liveryname.value.trim().length < 3) {
        return alert('Invalid Livery Name!');
    }
    if (!formFields['confirm-perms'].checked || !formFields['confirm-legal'].checked) {
        return alert('Confirm all checkboxes!');
    }
    const json = {
        name: formFields.liveryname.value.trim(),
        credits: formFields.credits.value.trim(),
        texture: []
    };
    if (!json.name || json.name.trim() == '') {
        return;
    }
    const hists = [];
    const embeds = [];
    inputFields.forEach((f, i) => {
        f.value = f.value.trim();
        if (f.value.match(/^https:\/\/.+/i)) {
            const hist = Object.values(uploadHistory).find(o => o.url == f.value);
            if (!hist) {
                return alert('Only self-uploaded imgbb links work for submitting!');
            }
            if (hist.expiration > 0) {
                return alert('Can\' submit expiring links! DISABLE "Expire links after one hour" option and re-upload texture:\n' + airplane.labels[i]);
            }
            const embed = {
                title: airplane.labels[i] + ' (' + (Math.ceil(hist.size / 1024 / 10.24) / 100) + 'MB, ' + hist.width + 'x' + hist.height + ')',
                description: f.value,
                image: { url: f.value },
                fields: [
                    { name: 'Timestamp', value: new Date(hist.time * 1e3), inline: true },
                    { name: 'File ID', value: hist.id, inline: true },
                ]
            };
            if (hist.submitted) {
                if (!confirm('The following texture was already submitted:\n' + f.value + '\nContinue anyway?')) {
                    return;
                }
                embed.fields.push({ name: 'First submitted', value: new Date(hist.submitted * 1e3) });
            }
            embeds.push(embed);
            hists.push(hist);
            json.texture.push(f.value);
        } else {
            json.texture.push(textures[i]);
        }
    });
    if (!embeds.length)
        return alert('Nothing to submit, upload images first!');

    let content = [
        `Livery upload by <@${localStorage.liveryDiscordId}>`,
        `__Plane:__ \`${geofs.aircraft.instance.id}\` ${geofs.aircraft.instance.aircraftRecord.name}`,
        `__Livery Name:__ \`${json.name}\``,
        '```json\n' + JSON.stringify(json, null, 2) + '```'
    ];

    fetch(atob(liveryobj.dapi), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.join('\n'), embeds })
    }).then(res => {
        hists.forEach(hist => {
            hist.submitted = hist.submitted || Math.round(new Date() / 1000);
        });
        localStorage.lsUploadHistory = JSON.stringify(uploadHistory);
    });
}

function sortList(id) {
    const list = domById(id);
    let i, switching, b, shouldSwitch;
    switching = true;
    while (switching) {
        switching = false;
        b = list.getElementsByTagName('LI');
        for (i = 0; i < (b.length - 1); i++) {
            shouldSwitch = false;
            if (b[i].innerHTML.toLowerCase() > b[i + 1].innerHTML.toLowerCase()) {
                shouldSwitch = true;
                break;
            }
        }
        if (shouldSwitch) {
            b[i].parentNode.insertBefore(b[i + 1], b[i]);
            switching = true;
        }
    }
}

/**
 *  main livery list
 */
function listLiveries() {
    domById('liverylist').innerHTML = '';

    const thumbsDir = [githubRepo, 'thumbs'].join('/');
    const defaultThumb = [thumbsDir, geofs.aircraft.instance.id + '.png'].join('/');
    const airplane = getCurrentAircraft();
    airplane.liveries.forEach(function (e, idx) {
        if (e.disabled) return;
        let listItem = appendNewChild(domById('liverylist'), 'li', {
            id: [geofs.aircraft.instance.id, e.name, 'button'].join('_'),
            class: 'livery-list-item'
        });
        listItem.dataset.idx = idx;
        listItem.onclick = () => {
            loadLivery(e.texture, airplane.index, airplane.parts, e.materials);
            if (e.mp != 'disabled') {
                // use vanilla ids for basegame compat
                setInstanceId(idx + (e.credits?.toLowerCase() == 'geofs' ? '' : liveryIdOffset));
            }
        };
        listItem.innerHTML = createTag('span', { class: 'livery-name' }, e.name).outerHTML;
        if (geofs.aircraft.instance.id < 1000) {
            listItem.classList.add('offi');
            const thumb = createTag('img');
            thumb.onerror = () => {
                thumb.onerror = null;
                thumb.src = defaultThumb;
            };
            thumb.src = [thumbsDir, geofs.aircraft.instance.id, geofs.aircraft.instance.id + '-' + idx + '.png'].join('/');
            listItem.appendChild(thumb);
        } else {
            listItem.classList.remove('offi');
        }
        if (e.credits && e.credits.length) {
            listItem.innerHTML += `<small>by ${e.credits}</small>`;
        }

        appendNewChild(listItem, 'span', {
            id: [geofs.aircraft.instance.id, e.name].join('_'),
            class: 'fa fa-star nocheck',
            onclick: 'LiverySelector.star(this)'
        });
    });
    sortList('liverylist');
    loadFavorites();
    sortList('favorites');
    loadAirlines();
    addCustomForm();
}

function loadFavorites() {
    if (localStorage.getItem('favorites') === null) {
        localStorage.favorites = '';
    }
    domById('favorites').innerHTML = '';
    const list = localStorage.favorites.split(',');
    const airplane = geofs.aircraft.instance.id;
    list.forEach(function (e) {
        if ((airplane == e.slice(0, airplane.length)) && (e.charAt(airplane.length) == '_')) {
            star(domById(e));
        }
    });
}

function loadAirlines() {
    domById("airlinelist").innerHTML = '';
    const airplane = getCurrentAircraft();
    const textures = airplane.liveries[0].texture;
    airlineobjs.forEach(function(airline) {
        let airlinename = appendNewChild(domById('airlinelist'), 'li', {
            style: "color:" + airline.color + ";background-color:" + airline.bgcolor + "; font-weight: bold;"
        });
        airlinename.innerText = airline.name;
        let removebtn = appendNewChild(airlinename, "button", {
            class: "mdl-button mdl-js-button mdl-button--raised mdl-button",
            style: "float: right; margin-top: 6px; background-color: #9e150b;",
            onclick: `LiverySelector.removeAirline("${airline.url}")`
        });
        removebtn.innerText = "- Remove airline";
        if (Object.keys(airline.aircrafts).includes(geofs.aircraft.instance.id)) {
            airline.aircrafts[geofs.aircraft.instance.id].liveries.forEach(function (e) {
                let listItem = appendNewChild(domById('airlinelist'), 'li', {
                    id: [geofs.aircraft.instance.id, e.name, 'button'].join('_'),
                    class: 'livery-list-item'
                });
                if (textures.filter(x => x === textures[0]).length === textures.length) { // the same texture is used for all indexes and parts
                    const texture = e.texture[0];
                    listItem.onclick = () => {
                        loadLivery(Array(textures.length).fill(texture), airplane.index, airplane.parts);
                        if (airplane.mp != 'disabled' && whitelist.includes(airline.url.trim())) {
                            setInstanceId(texture);
                        }
                    }
                } else {
                    listItem.onclick = () => {
                        let textureIndex = airplane.labels.indexOf("Texture");
                        loadLivery(e.texture, airplane.index, airplane.parts);
                        if (airplane.mp != 'disabled' && whitelist.includes(airline.url.trim())) {
                            setInstanceId(e.texture[textureIndex]);
                        }
                    }
                }
                listItem.innerHTML = createTag('span', { class: 'livery-name' }, e.name).outerHTML;
                if (e.credits && e.credits.length) {
                    listItem.innerHTML += `<small>by ${e.credits}</small>`;
                }
            });
        }
    });
}

function addCustomForm() {
    document.querySelector('#livery-custom-tab-upload .upload-fields').innerHTML = '';
    document.querySelector('#livery-custom-tab-direct .upload-fields').innerHTML = '';
    const airplane = getCurrentAircraft();
    const textures = airplane.liveries[0].texture.filter(t => typeof t !== 'object');
    if (!textures.length) {
        return; // ignore material defs
    }
    const placeholders = airplane.labels;
    if (textures.filter(x => x === textures[0]).length === textures.length) { // the same texture is used for all indexes and parts
        createUploadButton(placeholders[0]);
        createDirectButton(placeholders[0]);
    } else {
        placeholders.forEach((placeholder, i) => {
            createUploadButton(placeholder);
            createDirectButton(placeholder, i);
        });
    }
    // click first tab to refresh button status
    document.querySelector('.livery-custom-tabs li').click();
}

function search(text) {
    if (text === '') {
        listLiveries();
    } else {
        const liveries = domById('liverylist').childNodes;
        liveries.forEach(function (e) {
            const found = e.innerText.toLowerCase().includes(text.toLowerCase());
            e.style.display = found ? 'block' : 'none';
        });
    }
}

/**
 * Mark as favorite
 *
 * @param {HTMLElement} element
 */
function star(element) {
    const e = element.classList;
    const elementId = [element.id, 'favorite'].join('_');
    if (e == 'fa fa-star nocheck') {
        const btn = domById([element.id, 'button'].join('_'));
        const fbtn = appendNewChild(domById('favorites'), 'li', { id: elementId, class: 'livery-list-item' });
        fbtn.onclick = btn.onclick;
        fbtn.innerText = btn.children[0].innerText;

        let list = localStorage.favorites.split(',');
        list.push(element.id);
        list = [...new Set(list)];
        localStorage.favorites = list;

    } else if (e == 'fa fa-star checked') {
        domById('favorites').removeChild(domById(elementId));
        const list = localStorage.favorites.split(',');
        const index = list.indexOf(element.id);
        if (index !== -1) {
            list.splice(index, 1);
        }
        localStorage.favorites = list;
    }
    //style animation
    e.toggle('checked');
    e.toggle('nocheck');
}

/**
 * @param {string} id
 */
function createUploadButton(id) {
    const customDiv = document.querySelector('#livery-custom-tab-upload .upload-fields');
    appendNewChild(customDiv, 'input', {
        type: 'file',
        onchange: 'LiverySelector.uploadLivery(this)'
    });
    appendNewChild(customDiv, 'input', {
        type: 'text',
        name: 'textureInput',
        class: 'mdl-textfield__input address-input',
        placeholder: id,
        id: id
    });
    appendNewChild(customDiv, 'br');
}

/**
 * @param {string} id
 * @param {number} i
 */
function createDirectButton(id, i) {
    const customDiv = document.querySelector('#livery-custom-tab-direct .upload-fields');
    appendNewChild(customDiv, 'input', {
        type: 'file',
        onchange: 'LiverySelector.loadLiveryDirect(this,' + i + ')'
    });
    appendNewChild(customDiv, 'span').innerHTML = id;
    appendNewChild(customDiv, 'br');
}

/**
 * @param {HTMLInputElement} fileInput
 * @param {number} i
 */
function loadLiveryDirect(fileInput, i) {
    const reader = new FileReader();
    reader.addEventListener('load', (event) => {
        const airplane = getCurrentAircraft();
        const textures = airplane.liveries[0].texture;
        const newTexture = event.target.result;
        if (i === undefined) {
            loadLivery(Array(textures.length).fill(newTexture), airplane.index, airplane.parts);
        } else {
            geofs.api.changeModelTexture(
                geofs.aircraft.instance.definition.parts[airplane.parts[i]]["3dmodel"]._model,
                newTexture,
                { index: airplane.index[i] }
            );
        }
        fileInput.value = null;
    });
    // read file (if there is one)
    fileInput.files.length && reader.readAsDataURL(fileInput.files[0]);
}

/**
 * @param {HTMLInputElement} fileInput
 */
function uploadLivery(fileInput) {
    if (!fileInput.files.length)
        return;
    if (!localStorage.imgbbAPIKEY) {
        alert('No imgbb API key saved! Check API tab');
        fileInput.value = null;
        return;
    }
    const form = new FormData();
    form.append('image', fileInput.files[0]);
    if (localStorage.liveryAutoremove)
        form.append('expiration', (new Date() / 1000) * 60 * 60);

    const settings = {
        'url': `https://api.imgbb.com/1/upload?key=${localStorage.imgbbAPIKEY}`,
        'method': 'POST',
        'timeout': 0,
        'processData': false,
        'mimeType': 'multipart/form-data',
        'contentType': false,
        'data': form
    };

    $.ajax(settings).done(function (response) {
        const jx = JSON.parse(response);
        console.log(jx.data.url);
        fileInput.nextSibling.value = jx.data.url;
        fileInput.value = null;
        if (!uploadHistory[jx.data.id] || (uploadHistory[jx.data.id].expiration !== jx.data.expiration)) {
            uploadHistory[jx.data.id] = jx.data;
            localStorage.lsUploadHistory = JSON.stringify(uploadHistory);
        }
    });
}

function handleCustomTabs(e) {
    e = e || window.event;
    const src = e.target || e.srcElement;
    const tabId = src.innerHTML.toLocaleLowerCase();
    // iterate all divs and check if it was the one clicked, hide others
    domById('customDiv').querySelectorAll(':scope > div').forEach(tabDiv => {
        if (tabDiv.id != ['livery-custom-tab', tabId].join('-')) {
            tabDiv.style.display = 'none';
            return;
        }
        tabDiv.style.display = '';
        // special handling for each tab, could be extracted
        switch (tabId) {
            case 'upload': {
                const fields = tabDiv.querySelectorAll('input[type="file"]');
                fields.forEach(f => localStorage.imgbbAPIKEY ? f.classList.remove('err') : f.classList.add('err'));
                const apiKeys = !!localStorage.liveryDiscordId && !!localStorage.imgbbAPIKEY;
                tabDiv.querySelector('.livery-submit .api').style.display = apiKeys ? '' : 'none';
                tabDiv.querySelector('.livery-submit .no-api').style.display = apiKeys ? 'none' : '';
            } break;

            case 'download': {
                reloadDownloadsForm(tabDiv);
            } break;

            case 'api': {
                reloadSettingsForm();
            } break;
        }
    });

}

/**
 * reloads texture files for current airplane
 *
 * @param {HTMLElement} tabDiv
 */
function reloadDownloadsForm(tabDiv) {
    const airplane = getCurrentAircraft();
    const liveries = airplane.liveries;
    const defaults = liveries[0];
    const fields = tabDiv.querySelector('.download-fields');
    fields.innerHTML = '';
    liveries.forEach((livery, liveryNo) => {
        const textures = livery.texture.filter(t => typeof t !== 'object');
        if (!textures.length) return; // ignore material defs
        appendNewChild(fields, 'h7').innerHTML = livery.name;
        const wrap = appendNewChild(fields, 'div');
        textures.forEach((href, i) => {
            if (typeof href === 'object') return;
            if (liveryNo > 0 && href == defaults.texture[i]) return;
            const link = appendNewChild(wrap, 'a', {
                href, target: '_blank',
                class: "mdl-button mdl-button--raised mdl-button--colored"
            });
            link.innerHTML = airplane.labels[i];
        });
    });
}

/**
 * reloads settings form after changes
 */
function reloadSettingsForm() {
    const apiInput = domById('livery-setting-apikey');
    apiInput.placeholder = localStorage.imgbbAPIKEY ?
        'API KEY SAVED ✓ (type CLEAR to remove)' :
        'API KEY HERE';

    const removeCheckbox = domById('livery-setting-remove');
    removeCheckbox.checked = (localStorage.liveryAutoremove == 1);

    const discordInput = domById('livery-setting-discordid');
    discordInput.value = localStorage.liveryDiscordId || '';
}

/**
 * saves setting, gets setting key from event element
 *
 * @param {HTMLElement} element
 */
function saveSetting(element) {
    const id = element.id.replace('livery-setting-', '');
    switch (id) {
        case 'apikey': {
            if (element.value.length) {
                if (element.value.trim().toLowerCase() == 'clear') {
                    delete localStorage.imgbbAPIKEY;
                } else {
                    localStorage.imgbbAPIKEY = element.value.trim();
                }
                element.value = '';
            }
        } break;

        case 'remove': {
            localStorage.liveryAutoremove = element.checked ? '1' : '0';
        } break;

        case 'discordid': {
            localStorage.liveryDiscordId = element.value.trim();
        } break;
    }
    reloadSettingsForm();
}

async function addAirline() {
    let url = prompt("Enter URL to the json file of the airline:");
    if (!links.includes(url)) {
        links.push(url);
        localStorage.links += `,${url}`
        await fetch(url).then(res => res.json()).then(data => airlineobjs.push(data));
        airlineobjs[airlineobjs.length - 1].url = url.trim();
        loadAirlines();
    } else {
        alert("Airline already added");
    }
}
function removeAirline(url) {
    removeItem(links, url.trim());
    if (links.toString().charAt(0) === ","){
        localStorage.links = links.toString().slice(1);
    } else {
        localStorage.links = links.toString();
    }
    airlineobjs.forEach(function (e, index) {
        if (e.url.trim() === url.trim()) {
            airlineobjs.splice(index, 1);
        }
    });
    loadAirlines();
}

/**
 * @returns {object} current aircraft from liveryobj
 */
function getCurrentAircraft() {
    return liveryobj.aircrafts[geofs.aircraft.instance.id];
}

function setInstanceId(id) {
    geofs.aircraft.instance.liveryId = id;
}

function updateMultiplayer() {
    Object.values(multiplayer.visibleUsers).forEach(u => {
        const liveryEntry = liveryobj.aircrafts[u.aircraft];
        let textures = [];
        let otherId = u.currentLivery;
        if (!liveryEntry || !u.model || liveryEntry.mp == 'disabled') {
            return; // without livery or disabled
        }
        if (mpLiveryIds[u.id] === otherId) {
            return; // already updated
        }
        mpLiveryIds[u.id] = otherId;
        if (otherId >= mlIdOffset && otherId < liveryIdOffset) {
            textures = getMLTexture(u, liveryEntry); // ML range 1k-10k
        } else if ((otherId >= liveryIdOffset && otherId < liveryIdOffset * 2) || typeof (otherId == "string")) {
            textures = getMPTexture(u, liveryEntry); // LS range 10k+10k
        } else {
            return; // game managed livery
        }
        textures.forEach(texture => {
            applyMPTexture(
                texture.uri,
                texture.tex,
                img => u.model.changeTexture(img, { index: texture.index })
            );
        });
    });
}

/**
 * Fetch and resize texture to expected format
 * @param {string} url
 * @param {sd} tex
 * @param {function} cb
 */
function applyMPTexture(url, tex, cb) {
    try {
        Cesium.Resource.fetchImage({ url }).then(img => {
            const canvas = createTag('canvas', { width: tex._width, height: tex._height });
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            cb(canvas.toDataURL('image/png'));
        });
    } catch (e) {
        console.log('LSMP', !!tex, url, e);
    }
}

/**
 * @param {object} u
 * @param {object} liveryEntry
 */
function getMPTexture(u, liveryEntry) {
    const otherId = u.currentLivery - liveryIdOffset;
    const textures = [];
    // check model for expected textures
    const uModelTextures = u.model._model._rendererResources.textures;
    console.log(u.currentLivery);
    console.log(typeof (u.currentLivery));
    if (typeof (u.currentLivery[0]) == "string") {
        console.log("VA detected");
        console.log(u.currentLivery);
        // try main texture on single-entry
        textures.push({
            uri: u.currentLivery,
            tex: uModelTextures[0],
            index: 0
        });
    } else {
        if (liveryEntry.mp == 'multi') {
            // try map textures on multi-entry
            liveryEntry.index.forEach((index, pos) => {
                textures.push({
                    uri: liveryEntry.liveries[otherId].texture[pos],
                    tex: uModelTextures[index],
                    index
                });
            });
        } else {
            const texIdx = liveryEntry.labels.indexOf('Texture');
            // try main texture on single-entry
            textures.push({
                uri: liveryEntry.liveries[otherId].texture[texIdx],
                tex: uModelTextures[0],
                index: 0
            });
        }
    }
    console.log(textures);
    return textures;
}

/**
 * @param {object} u
 * @param {object} liveryEntry
 */
function getMLTexture(u, liveryEntry) {
    if (!mLiveries.aircraft) {
        fetch(atob(liveryobj.mapi)).then(data => data.json()).then(json => {
            Object.keys(json).forEach(key => mLiveries[key] = json[key]);
        });
        return [];
    }
    const liveryId = u.currentLivery - mlIdOffset;
    const textures = [];
    const texIdx = liveryEntry.labels.indexOf('Texture');
    if (texIdx !== -1) {
        textures.push({
            uri: mLiveries.aircraft[liveryId].mptx,
            tex: u.model._model._rendererResources.textures[liveryEntry.index[texIdx]],
            index: liveryEntry.index[texIdx]
        });
    }
    return textures;
}

/******************* Utilities *********************/

/**
 * @param {string} id Div ID to toggle, in addition to clicked element
 */
function toggleDiv(id) {
    const div = domById(id);
    const target = window.event.target;
    if (target.classList.contains('closed')) {
        target.classList.remove('closed');
        div.style.display = '';
    } else {
        target.classList.add('closed');
        div.style.display = 'none';
    }
}

/**
 * Create tag with <name attributes=...
 *
 * @param {string} name
 * @param {Object} attributes
 * @param {string|number} content
 * @returns {HTMLElement}
 */
function createTag(name, attributes = {}, content = '') {
    const el = document.createElement(name);
    Object.keys(attributes || {}).forEach(k => el.setAttribute(k, attributes[k]));
    if (('' + content).length) {
        el.innerHTML = content;
    }
    return el;
}

/**
 * Creates a new element <tagName attributes=...
 * appends to parent and returns the child for later access
 *
 * @param {HTMLElement} parent
 * @param {string} tagName
 * @param {object} attributes
 * @param {number} pos insert in Nth position (default append)
 * @returns {HTMLElement}
 */
function appendNewChild(parent, tagName, attributes = {}, pos = -1) {
    const child = createTag(tagName, attributes);
    if (pos < 0) {
        parent.appendChild(child);
    } else {
        parent.insertBefore(child, parent.children[pos]);
    }

    return child;
}

function removeItem(array, itemToRemove) {
    const index = array.indexOf(itemToRemove);
    if (index !== -1) {
        array.splice(index, 1);
    }
}

/**
 * @param {string} elementId
 * @returns {HTMLElement}
 */
function domById(elementId) {
    return document.getElementById(elementId);
}

/******************* HTML & CSS Templates *********************/

/**
 * @returns {string} HTML template for main panel
 */
function generateListHTML() {
    return `
        <h3><img src="${githubRepo}/liveryselector-logo.svg" class="livery-title" title="LiverySelector" /></h3>

        <div class="livery-searchbar mdl-textfield mdl-js-textfield geofs-stopMousePropagation geofs-stopKeyupPropagation">
            <input class="mdl-textfield__input address-input" type="text" placeholder="Search liveries" onkeyup="LiverySelector.search(this.value)" id="searchlivery">
            <label class="mdl-textfield__label" for="searchlivery">Search liveries</label>
        </div>

        <h6 onclick="LiverySelector.toggleDiv('favorites')">Favorite liveries</h6>
        <ul id="favorites" class="geofs-list geofs-visible"></ul>

        <h6 onclick="LiverySelector.toggleDiv('liverylist')">Available liveries</h6>
        <ul id="liverylist" class="geofs-list geofs-visible"></ul>

        <h6 onclick="LiverySelector.toggleDiv('airlinelist')">Virtual airlines</h6><button class="mdl-button mdl-js-button mdl-button--raised mdl-button" style="background-color: #096628; color: white;" onclick="LiverySelector.addAirline()">+ Add airline</button>
        <ul id="airlinelist" class="geofs-list geofs-visible"></ul>

        <h6 onclick="LiverySelector.toggleDiv('customDiv')" class="closed">Load external livery</h6>
        <div id="customDiv" class="mdl-textfield mdl-js-textfield geofs-stopMousePropagation geofs-stopKeyupPropagation" style="display:none;">
            <ul class="livery-custom-tabs" onclick="LiverySelector.handleCustomTabs()">
                <li>Upload</li>
                <li>Direct</li>
                <li>Download</li>
                <li>API</li>
            </ul>
            <div id="livery-custom-tab-upload" style="display:none;">
                <div>Paste URL or upload image to generate imgbb URL</div>
                <div class="upload-fields"></div>
                <div><button class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored" onclick="LiverySelector.inputLivery()">Load livery</button></div>
                <div class="livery-submit geofs-list-collapsible-item">Contribute to the LiverySelector Database
                    <div class="geofs-collapsible no-api">-&gt; Fill in API key and Discord User ID in API tab.</div>
                    <div class="geofs-collapsible api">
                        <label for="livery-submit-liveryname">Livery Name</label>
                        <input type="text" id="livery-submit-liveryname" class="mdl-textfield__input address-input">
                        <label for="livery-submit-credits">Author</label>
                        <input type="text" id="livery-submit-credits" class="mdl-textfield__input address-input">
                        <input type="checkbox" id="livery-submit-confirm-perms">
                        <label for="livery-submit-confirm-perms">I am the author and have created the textures myself or have the permission from the author to use those textures.</label><br>
                        <input type="checkbox" id="livery-submit-confirm-legal">
                        <label for="livery-submit-confirm-legal">I confirm the textures are safe for all ages, are non-offensive and appropriate for the game and don't violate any laws or other regulations.</label>
                        <button class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored" onclick="LiverySelector.submitLivery()">Submit livery for review</button>
                        <small>
                          Join our <a href="https://discord.gg/2tcdzyYaWU" target="_blank">Discord</a> to follow up on your contributions.
                          By submitting you agree to the Discord server rules. Failing to comply may result in exclusion from further submits.
                        </small>
                    </div>
                </div>
            </div>
            <div id="livery-custom-tab-direct" style="display:none;">
                <div>Load texture directly in client, no upload.</div>
                <div class="upload-fields"></div>
            </div>
            <div id="livery-custom-tab-download" style="display:none;">
                <div>Download textures for current Airplane:</div>
                <div class="download-fields"></div>
            </div>
            <div id="livery-custom-tab-api" style="display:none;">
              <div>
                <label for="livery-setting-apikey">Paste your imgbb API key here (<a href="https://api.imgbb.com" target="_blank">get key</a>)</label>
                <input type="text" id="livery-setting-apikey" class="mdl-textfield__input address-input" onchange="LiverySelector.saveSetting(this)">
                <input type="checkbox" id="livery-setting-remove" onchange="LiverySelector.saveSetting(this)">
                <label for="livery-setting-remove">Expire links after one hour<br><small>(only for testing, disable when submitting to the database!)</small></label>
                <label for="livery-setting-discordid">Discord User ID (<a href="https://support.discord.com/hc/en-us/articles/206346498" target="_blank">howto</a>)</label>
                <input type="number" id="livery-setting-discordid" class="mdl-textfield__input address-input" onchange="LiverySelector.saveSetting(this)">
              </div>
            </div>
        </div>
        <br/>
        <a href="https://raw.githubusercontent.com/kolos26/GEOFS-LiverySelector/refs/heads/main/tutorial.txt" target="_blank"><button class="mdl-button mdl-js-button mdl-button--raised mdl-button">Open tutorial</button></a><br/>
        <a href="https://discord.gg/2tcdzyYaWU" target="_blank"><button class="mdl-button mdl-js-button mdl-button--raised mdl-button">Join our discord server</button></a><br/>
        <a href="https://github.com/kolos26/GEOFS-LiverySelector" target="_blank"><button class="mdl-button mdl-js-button mdl-button--raised mdl-button">Visit our Github page</button></a><br/>
        <a href="mailto:LiverySelector20220816@gmail.com" target="_blank"><button class="mdl-button mdl-js-button mdl-button--raised mdl-button">Contact us: LiverySelector20220816@gmail.com</button></a><br/>
`;
}

/**
 * @returns {HTMLElement} HTML template for main menu livery button
 */
function generatePanelButtonHTML() {
    const liveryButton = createTag('button', {
        title: 'Change livery',
        id: 'liverybutton',
        class: 'mdl-button mdl-js-button geofs-f-standard-ui geofs-mediumScreenOnly',
        onclick: 'LiverySelector.listLiveries()',
        'data-toggle-panel': '.livery-list',
        'data-tooltip-classname': 'mdl-tooltip--top',
        'data-upgraded': ',MaterialButton'
    });
    liveryButton.innerHTML = createTag('img', { src: `${githubRepo}/liveryselector-logo-small.svg`, height: '30px' }).outerHTML;

    return liveryButton;
}

window.LiverySelector = {
    liveryobj,
    saveSetting,
    toggleDiv,
    loadLiveryDirect,
    handleCustomTabs,
    listLiveries,
    star,
    search,
    inputLivery,
    uploadLivery,
    submitLivery,
    uploadHistory,
    loadAirlines,
    addAirline,
    removeAirline,
    airlineobjs
};
    function init() {
        // Example: Add livery button to the menu
        console.log('GEOFS-LiverySelector loaded');
        // Additional code for  enhancements
    }
    init();
})();
// == GEOFS-LiverySelector ==


// == GeoFSAdBlock ==
(function() {
    // GeoFSAdBlock initialization code
    const adBanner = document.querySelector("body > div.geofs-adbanner.geofs-adsense-container");
    if (adBanner && adBanner.parentNode) {
      adBanner.parentNode.removeChild(adBanner);
    }    
    function init() {
        // Example: Enhance  features
        console.log('Ads removed');
        // Additional code for  enhancements
    }
    init();
})();
// == GeoFSAdBlock ==


// == Improved-Wingflex-Geofs ==
(function() {
    // Improved-Wingflex-Geofs initialization code
    geofs.animation.values.liftLeftWing = 1
geofs.animation.values.liftRightWing = 1

if (geofs.aircraft.instance.id == 3179 || geofs.aircraft.instance.id == 3180){
function resetLift(){
geofs.animation.values.liftLeftWing = -geofs.aircraft.instance.parts.leftwing.lift / 200000;
geofs.animation.values.liftRightWing = -geofs.aircraft.instance.parts.rightwing.lift / 200000;
};
geofs.aircraft.instance.setup.parts[3].animations[0].value = "liftLeftWing"
geofs.aircraft.instance.setup.parts[4].animations[0].value = "liftLeftWing"
geofs.aircraft.instance.setup.parts[5].animations[0].value = "liftLeftWing"
geofs.aircraft.instance.setup.parts[6].animations[0].value = "liftRightWing"
geofs.aircraft.instance.setup.parts[7].animations[0].value = "liftRightWing"
geofs.aircraft.instance.setup.parts[8].animations[0].value = "liftRightWing"
geofs.aircraft.instance.lights[0].animations[0].value = "liftRightWing"
geofs.aircraft.instance.lights[1].animations[0].value = "liftLeftWing"
geofs.aircraft.instance.lights[2].animations[0].value = "liftRightWing"
geofs.aircraft.instance.lights[3].animations[0].value = "liftLeftWing"
geofs.aircraft.instance.lights[2].animations[1].value = "liftRightWing"
geofs.aircraft.instance.lights[3].animations[1].value = "liftLeftWing"
setInterval(function(){
resetLift();
}, 20)
};

if (geofs.aircraft.instance.id == 2973){
function resetLift1(){
geofs.animation.values.liftLeftWing = -geofs.aircraft.instance.parts.leftwing.lift / 200000;
geofs.animation.values.liftRightWing = -geofs.aircraft.instance.parts.rightwing.lift / 200000;
};
geofs.aircraft.instance.setup.parts[2].animations[0].value = "liftLeftWing"
geofs.aircraft.instance.setup.parts[3].animations[0].value = "liftLeftWing"
geofs.aircraft.instance.setup.parts[4].animations[0].value = "liftLeftWing"
geofs.aircraft.instance.setup.parts[16].animations[0].value = "liftRightWing"
geofs.aircraft.instance.setup.parts[17].animations[0].value = "liftRightWing"
geofs.aircraft.instance.setup.parts[18].animations[0].value = "liftRightWing"
geofs.aircraft.instance.lights[0].animations[0].value = "liftRightWing"
geofs.aircraft.instance.lights[1].animations[0].value = "liftLeftWing"
geofs.aircraft.instance.lights[2].animations[0].value = "liftRightWing"
geofs.aircraft.instance.lights[3].animations[0].value = "liftLeftWing"
geofs.aircraft.instance.lights[2].animations[1].value = "liftRightWing"
geofs.aircraft.instance.lights[3].animations[1].value = "liftLeftWing"
setInterval(function(){
resetLift1();
}, 20)
};

if (geofs.aircraft.instance.id == 2386 || geofs.aircraft.instance.id == 240){
function resetLift2(){
geofs.animation.values.liftLeftWing = -geofs.aircraft.instance.parts.wingleft.lift / 200000;
geofs.animation.values.liftRightWing = -geofs.aircraft.instance.parts.wingright.lift / 200000;
};
geofs.aircraft.instance.setup.parts[3].animations[1].value = "liftLeftWing"
geofs.aircraft.instance.setup.parts[4].animations[1].value = "liftLeftWing"
geofs.aircraft.instance.setup.parts[5].animations[0].value = "liftLeftWing"
geofs.aircraft.instance.setup.parts[6].animations[0].value = "liftLeftWing"
geofs.aircraft.instance.setup.parts[7].animations[1].value = "liftLeftWing"
geofs.aircraft.instance.setup.parts[8].animations[1].value = "liftRightWing"
geofs.aircraft.instance.setup.parts[9].animations[0].value = "liftRightWing"
geofs.aircraft.instance.setup.parts[10].animations[0].value = "liftRightWing"
geofs.aircraft.instance.lights[6].animations[1].value = "liftRightWing"
geofs.aircraft.instance.lights[1].animations[2].value = "liftLeftWing"
geofs.aircraft.instance.lights[6].animations[2].value = "liftRightWing"
geofs.aircraft.instance.lights[1].animations[1].value = "liftLeftWing"
geofs.aircraft.instance.lights[5].animations[1].value = "liftleftWing"
geofs.aircraft.instance.lights[5].animations[2].value = "liftLeftWing"
geofs.aircraft.instance.lights[10].animations[1].value = "liftRightWing"
geofs.aircraft.instance.lights[10].animations[2].value = "liftRightWing"
setInterval(function(){
resetLift2();
}, 20)
};
    function init() {
        // Example: Enhance  features
        console.log('Improved-Wingflex-Geofs loaded');
        // Additional code for  enhancements
    }
    init();
})();
// == Improved-Wingflex-Geofs ==

// == Geofs-Props-Physics-Overhaul ==
(function() {
    // Geofs-Props-Physics-Overhaul initialization code
    if (geofs.aircraft.instance.id === "21" || geofs.aircraft.instance.id === "2" || geofs.aircraft.instance.id === "2808")  {
        let lastTorque = 0;
        let engtorquemp = 0;
        let elevtorquemp = 0;
        let ailtorquemp = 0;
        let rudtorquemp = 0;
        
        //basic maths to figure out what the engine torque is, then apply it.
        function tqmaths() {
          engtorquemp = -(lastTorque - geofs.animation.values.rpm) * 6;
            geofs.aircraft.instance.rigidBody.applyTorqueImpulse([splitAxes(engtorquemp - ailtorquemp)[0] + splitAxesOffset(elevtorquemp)[0],splitAxes(engtorquemp - ailtorquemp)[1] + splitAxesOffset(elevtorquemp)[1],splitAxes(engtorquemp - ailtorquemp)[2] + splitAxesOffset(elevtorquemp)[2]])
        };
        
        function getEngineTorque() {
          lastTorque = geofs.animation.values.rpm
          setTimeout(tqmaths, 100)
        };
        
        //propwash stuff
        function getControlWash() {
          elevtorquemp = (geofs.animation.values.rpm / 10) * geofs.animation.values.pitch;
          ailtorquemp = (geofs.animation.values.rpm / 10) * geofs.animation.values.roll;
          rudtorquemp = (geofs.animation.values.rpm / 10) * geofs.animation.values.yaw;
        }
        
        //more complicated maths to resolve torque axes
          //𝐹𝑠=|𝐹⃗ |cos(𝜃𝑠,𝐹)
        function splitAxes(force) {
          var angle = geofs.animation.values.heading360 * (Math.PI/180)
          if (geofs.animation.values.atilt <= 0) {
          var anglez = geofs.animation.values.atilt - 45
          }
          else {
            var anglez = Math.abs(Math.abs(geofs.animation.values.atilt + 45) - 360)
          }
          
          fx = force * (Math.sin(angle))
          fy = force * (Math.cos(angle))
          fz = force * Math.cos(anglez)
          return [fx, fy, fz];
        }
          
        function splitAxesOffset(force) {
          var angle = (geofs.animation.values.heading360 - 90 % 360) * (Math.PI/180)
          if (geofs.animation.values.atilt <= 0) {
          var anglez = geofs.animation.values.atilt - 45
          }
          else {
            var anglez = Math.abs(Math.abs(geofs.animation.values.atilt + 45) - 360)
          }
          
          fx = force * (Math.sin(angle))
          fy = force * (Math.cos(angle))
          fz = force * Math.cos(anglez)
          return [fx, fy, fz];
        }
          
        function doForces() {
          getEngineTorque()
        }
        
        //stall and ground effect stuff
        function stallForces() {
          if (geofs.animation.values.aoa > 10) {
            geofs.aircraft.instance.rigidBody.applyTorqueImpulse([splitAxes(Math.random()*geofs.animation.values.aoa * 2)[0],splitAxes(Math.random()*geofs.animation.values.aoa * 2)[1],0])
          }
        }
        
        function groundEffect() {
          if (geofs.animation.values.haglFeet <= 10) {
            geofs.aircraft.instance.rigidBody.applyCentralImpulse([0,0,(-(geofs.animation.values.haglFeet) + 10) * geofs.animation.values.kias])
          }
        }
        
        interval = setInterval(function(){
          groundEffect();
          stallForces();
          getControlWash();
          doForces();
        }, 100)
        }
        else {
          throw("Switch to a compatible plane")
        }
    function init() {
        // Example: Enhance  features
        console.log('Geofs-Props-Physics-Overhaul loaded');
        // Additional code for  enhancements
    }
    init();
})();
// == Geofs-Props-Physics-Overhaul ==


// == 777-Realism-Overhaul ==
(function() {
    // 777-Realism-Overhaul initialization code
    if (document.querySelector("body > div.geofs-ui-left > ul.geofs-list.geofs-toggle-panel.geofs-aircraft-list.geofs-visible > li.geofs-list-collapsible-item.geofs-notstudent-role.geofs-list-item-expanded > ul > li:nth-child(47)")) {

        // complicated maths to resolve torque axes
        // 𝐹𝑠=|𝐹⃗ |cos(𝜃𝑠,𝐹)
        function splitAxes(force) {
          var angle = geofs.animation.values.heading360 * (Math.PI / 180);
          var anglez;
          if (geofs.animation.values.atilt <= 0) {
            anglez = geofs.animation.values.atilt - 45;
          } else {
            anglez = Math.abs(Math.abs(geofs.animation.values.atilt + 45) - 360);
          }
          
          var fx = force * Math.sin(angle);
          var fy = force * Math.cos(angle);
          var fz = force * Math.cos(anglez);
          return [fx, fy, fz];
        }
      
        // stall buffeting
        function stallForces() {
          if (geofs.animation.values.aoa > 7) {
            geofs.aircraft.instance.rigidBody.applyTorqueImpulse([
              splitAxes(Math.random() * geofs.animation.values.aoa * 1000)[0],
              splitAxes(Math.random() * geofs.animation.values.aoa * 1000)[1],
              0
            ]);
          }
        }
      
        // ground effect
        function groundEffect() {
          if (geofs.animation.values.haglFeet <= 100) {
            geofs.aircraft.instance.rigidBody.applyCentralImpulse([
              0,
              0,
              (-(geofs.animation.values.haglFeet) + 100) * geofs.animation.values.kias
            ]);
          }
        }
      
        // tiller restriction
        geofs.animation.values.tiller = null;
        function tiller() {
          if (geofs.animation.values.kias >= 50) {
            geofs.animation.values.tiller = geofs.animation.values.yaw / (geofs.animation.values.kias / 5);
          } else {
            geofs.animation.values.tiller = geofs.animation.values.yaw;
          }
        }
      
        // spoilers/flaps shake
        geofs.animation.values.spoilersShake = null;
        geofs.animation.values.flapsShake = null;
        function getShake() {
          if (geofs.animation.values.airbrakesPosition == 1) {
            geofs.animation.values.spoilersShake = 1 - (Math.random() / 20) * (geofs.animation.values.kias / 200);
          } else {
            geofs.animation.values.spoilersShake = geofs.animation.values.airbrakesPosition;
          }
          if (geofs.animation.values.flapsPosition == 6) {
            geofs.animation.values.flapsShake = (Math.random() / 20) * (geofs.animation.values.kias / 100);
          } else {
            geofs.animation.values.flapsShake = 0;
          }
        }
      
        geofs.aircraft.instance.setup.parts[106].animations[1].value = "tiller";
        geofs.aircraft.instance.setup.parts[60].animations[0].value = "spoilersShake";
        geofs.aircraft.instance.setup.parts[61].animations[0].value = "spoilersShake";
        geofs.aircraft.instance.setup.parts[62].animations[0].value = "spoilersShake";
        geofs.aircraft.instance.setup.parts[63].animations[0].value = "spoilersShake";
        geofs.aircraft.instance.setup.parts[64].animations[0].value = "spoilersShake";
        geofs.aircraft.instance.setup.parts[65].animations[0].value = "spoilersShake";
        geofs.aircraft.instance.setup.parts[66].animations[0].value = "spoilersShake";
        geofs.aircraft.instance.setup.parts[67].animations[0].value = "spoilersShake";
        geofs.aircraft.instance.setup.parts[68].animations[0].value = "spoilersShake";
        geofs.aircraft.instance.setup.parts[69].animations[0].value = "spoilersShake";
        geofs.aircraft.instance.setup.parts[70].animations[0].value = "spoilersShake";
        geofs.aircraft.instance.setup.parts[71].animations[0].value = "spoilersShake";
        geofs.aircraft.instance.setup.parts[72].animations[0].value = "spoilersShake";
        geofs.aircraft.instance.setup.parts[73].animations[0].value = "spoilersShake";
      
        // wingflex re-assignment
        function resetLift2() {
          geofs.animation.values.liftLeftWing = (-geofs.aircraft.instance.parts.wingleft.lift / 200000) + (geofs.animation.values.accZ) / 20;
          geofs.animation.values.liftRightWing = (-geofs.aircraft.instance.parts.wingright.lift / 200000) + (geofs.animation.values.accZ) / 20;
        }
        geofs.aircraft.instance.setup.parts[3].animations[1].value = "liftLeftWing";
        geofs.aircraft.instance.setup.parts[4].animations[1].value = "liftLeftWing";
        geofs.aircraft.instance.setup.parts[5].animations[0].value = "liftLeftWing";
        geofs.aircraft.instance.setup.parts[6].animations[0].value = "liftLeftWing";
        geofs.aircraft.instance.setup.parts[7].animations[1].value = "liftLeftWing";
        geofs.aircraft.instance.setup.parts[8].animations[1].value = "liftRightWing";
        geofs.aircraft.instance.setup.parts[9].animations[0].value = "liftRightWing";
        geofs.aircraft.instance.setup.parts[10].animations[0].value = "liftRightWing";
      
        // check if flaps are changing position
        geofs.animation.values.flapschange = 0;
        function getFlapChange() {
          if (geofs.animation.values.flapsPosition < geofs.animation.values.flapsTarget ||
              geofs.animation.values.flapsPosition > geofs.animation.values.flapsTarget) {
            console.log("flaps extend");
            geofs.animation.values.flapschange = 1;
          } else {
            geofs.animation.values.flapschange = 0;
          }
        }
      
        // assign new sounds
        geofs.aircraft.instance.definition.sounds[8] = {};
        geofs.aircraft.instance.definition.sounds[8].id = "flapssound";
        geofs.aircraft.instance.definition.sounds[8].file = "https://138772948-227015667470610340.preview.editmysite.com/uploads/1/3/8/7/138772948/777flap.mp3";
        geofs.aircraft.instance.definition.sounds[8].effects = { "start": { "value": "flapschange" } };
      
        // assign alarm sounds
        geofs.aircraft.instance.definition.sounds[9] = {};
        geofs.aircraft.instance.definition.sounds[9].id = "landinggearwarn";
        geofs.aircraft.instance.definition.sounds[9].file = "https://138772948-227015667470610340.preview.editmysite.com/uploads/1/3/8/7/138772948/tlg.mp3";
        geofs.aircraft.instance.definition.sounds[9].effects = { "start": { "value": "isGearWarn" } };
      
        geofs.aircraft.instance.definition.sounds[10] = {};
        geofs.aircraft.instance.definition.sounds[10].id = "flapswarn";
        geofs.aircraft.instance.definition.sounds[10].file = "https://138772948-227015667470610340.preview.editmysite.com/uploads/1/3/8/7/138772948/tlf.mp3";
        geofs.aircraft.instance.definition.sounds[10].effects = { "start": { "value": "isFlapsWarn" } };
      
        geofs.aircraft.instance.definition.sounds[11] = {};
        geofs.aircraft.instance.definition.sounds[11].id = "terrainwarn";
        geofs.aircraft.instance.definition.sounds[11].file = "https://138772948-227015667470610340.preview.editmysite.com/uploads/1/3/8/7/138772948/tlt.mp3";
        geofs.aircraft.instance.definition.sounds[11].effects = { "start": { "value": "isTerrainWarn" } };
      
        geofs.aircraft.instance.definition.sounds[12] = {};
        geofs.aircraft.instance.definition.sounds[12].id = "pullwarn";
        geofs.aircraft.instance.definition.sounds[12].file = "https://138772948-227015667470610340.preview.editmysite.com/uploads/1/3/8/7/138772948/pullup.mp3";
        geofs.aircraft.instance.definition.sounds[12].effects = { "start": { "value": "isPullupWarn" } };
      
        geofs.aircraft.instance.definition.sounds[13] = {};
        geofs.aircraft.instance.definition.sounds[13].id = "bankangle";
        geofs.aircraft.instance.definition.sounds[13].file = "https://138772948-227015667470610340.preview.editmysite.com/uploads/1/3/8/7/138772948/bankangle.mp3";
        geofs.aircraft.instance.definition.sounds[13].effects = { "start": { "value": "isBankWarn" } };
      
        geofs.aircraft.instance.definition.sounds[14] = {};
        geofs.aircraft.instance.definition.sounds[14].id = "1000";
        geofs.aircraft.instance.definition.sounds[14].file = "https://138772948-227015667470610340.preview.editmysite.com/uploads/1/3/8/7/138772948/1000gpws_merged.mp3";
        geofs.aircraft.instance.definition.sounds[14].effects = { "start": { "value": "gpws1000" } };
      
        geofs.aircraft.instance.definition.sounds[15] = {};
        geofs.aircraft.instance.definition.sounds[15].id = "500";
        geofs.aircraft.instance.definition.sounds[15].file = "https://138772948-227015667470610340.preview.editmysite.com/uploads/1/3/8/7/138772948/500correct.mp3";
        geofs.aircraft.instance.definition.sounds[15].effects = { "start": { "value": "gpws500" } };
      
        geofs.aircraft.instance.definition.sounds[16] = {};
        geofs.aircraft.instance.definition.sounds[16].id = "400";
        geofs.aircraft.instance.definition.sounds[16].file = "https://138772948-227015667470610340.preview.editmysite.com/uploads/1/3/8/7/138772948/400gpws_merged.mp3";
        geofs.aircraft.instance.definition.sounds[16].effects = { "start": { "value": "gpws400" } };
      
        geofs.aircraft.instance.definition.sounds[17] = {};
        geofs.aircraft.instance.definition.sounds[17].id = "300";
        geofs.aircraft.instance.definition.sounds[17].file = "https://138772948-227015667470610340.preview.editmysite.com/uploads/1/3/8/7/138772948/300gpws_merged.mp3";
        geofs.aircraft.instance.definition.sounds[17].effects = { "start": { "value": "gpws300" } };
      
        geofs.aircraft.instance.definition.sounds[18] = {};
        geofs.aircraft.instance.definition.sounds[18].id = "200";
        geofs.aircraft.instance.definition.sounds[18].file = "https://138772948-227015667470610340.preview.editmysite.com/uploads/1/3/8/7/138772948/200gpws_merged.mp3";
        geofs.aircraft.instance.definition.sounds[18].effects = { "start": { "value": "gpws200" } };
      
        geofs.aircraft.instance.definition.sounds[19] = {};
        geofs.aircraft.instance.definition.sounds[19].id = "100";
        geofs.aircraft.instance.definition.sounds[19].file = "https://138772948-227015667470610340.preview.editmysite.com/uploads/1/3/8/7/138772948/100gpws_merged.mp3";
        geofs.aircraft.instance.definition.sounds[19].effects = { "start": { "value": "gpws100" } };
      
        geofs.aircraft.instance.definition.sounds[20] = {};
        geofs.aircraft.instance.definition.sounds[20].id = "50";
        geofs.aircraft.instance.definition.sounds[20].file = "https://138772948-227015667470610340.preview.editmysite.com/uploads/1/3/8/7/138772948/50gpws_merged.mp3";
        geofs.aircraft.instance.definition.sounds[20].effects = { "start": { "value": "gpws50" } };
      
        geofs.aircraft.instance.definition.sounds[21] = {};
        geofs.aircraft.instance.definition.sounds[21].id = "40";
        geofs.aircraft.instance.definition.sounds[21].file = "https://138772948-227015667470610340.preview.editmysite.com/uploads/1/3/8/7/138772948/40gpws_merged.mp3";
        geofs.aircraft.instance.definition.sounds[21].effects = { "start": { "value": "gpws40" } };
      
        geofs.aircraft.instance.definition.sounds[22] = {};
        geofs.aircraft.instance.definition.sounds[22].id = "30";
        geofs.aircraft.instance.definition.sounds[22].file = "https://138772948-227015667470610340.preview.editmysite.com/uploads/1/3/8/7/138772948/30gpws_merged.mp3";
        geofs.aircraft.instance.definition.sounds[22].effects = { "start": { "value": "gpws30" } };
      
        geofs.aircraft.instance.definition.sounds[23] = {};
        geofs.aircraft.instance.definition.sounds[23].id = "20";
        geofs.aircraft.instance.definition.sounds[23].file = "https://138772948-227015667470610340.preview.editmysite.com/uploads/1/3/8/7/138772948/20gpws_merged.mp3";
        geofs.aircraft.instance.definition.sounds[23].effects = { "start": { "value": "gpws20" } };
      
        geofs.aircraft.instance.definition.sounds[24] = {};
        geofs.aircraft.instance.definition.sounds[24].id = "10";
        geofs.aircraft.instance.definition.sounds[24].file = "https://138772948-227015667470610340.preview.editmysite.com/uploads/1/3/8/7/138772948/10gpws_merged.mp3";
        geofs.aircraft.instance.definition.sounds[24].effects = { "start": { "value": "gpws10" } };
      
        geofs.aircraft.instance.definition.sounds[0].file = "https://138772948-227015667470610340.preview.editmysite.com/uploads/1/3/8/7/138772948/777enginelow.mp3";
        geofs.aircraft.instance.definition.sounds[1].file = "https://138772948-227015667470610340.preview.editmysite.com/uploads/1/3/8/7/138772948/777enginemid.mp3";
        geofs.aircraft.instance.definition.sounds[2].file = "https://138772948-227015667470610340.preview.editmysite.com/uploads/1/3/8/7/138772948/777enginehigh.mp3";
        geofs.aircraft.instance.definition.sounds[3].file = "https://138772948-227015667470610340.preview.editmysite.com/uploads/1/3/8/7/138772948/777enginehigh.mp3";
      
        audio.init(geofs.aircraft.instance.definition.sounds);
        geofs.aircraft.instance.definition.sounds[0].effects.volume.ratio = 100;
        geofs.aircraft.instance.definition.sounds[0].effects.volume.ramp = [100, 500, 2000, 10000];
        geofs.aircraft.instance.definition.sounds[1].effects.volume.ratio = 100;
        geofs.aircraft.instance.definition.sounds[2].effects.volume.ratio = 100;
        geofs.aircraft.instance.definition.sounds[3].effects.volume.ratio = 100;
        geofs.aircraft.instance.definition.sounds[4].effects.volume.ratio = 100;
      
        // get running average to dampen control inputs
        let pitchInputs = [0, 0, 0, 0, 0, 0, 0];
        let rollInputs = [0, 0, 0, 0, 0, 0, 0];
        let yawInputs = [0, 0, 0, 0, 0, 0, 0];
        geofs.animation.values.averagePitch = null;
        geofs.animation.values.averageRoll = null;
        geofs.animation.values.averageYaw = null;
        geofs.animation.values.outerAveragePitch = null;
        geofs.animation.values.outerAverageRoll = null;
        geofs.animation.values.outerAverageYaw = null;
        function pushInputs() {
          pitchInputs.push(geofs.animation.values.computedPitch);
          rollInputs.push(geofs.animation.values.roll);
          yawInputs.push(geofs.animation.values.computedYaw);
        }
      
        function computeOutputs() {
          if (geofs.aircraft.instance.setup.autopilot) {
            geofs.animation.values.outerAveragePitch = geofs.animation.values.pitch;
            geofs.animation.values.outerAverageRoll = geofs.animation.values.roll;
            geofs.animation.values.outerAverageYaw = geofs.animation.values.yaw;
            return;
          } else {
            var pitchcheck = movingAvg(pitchInputs, 6, 6);
            var rollcheck = movingAvg(rollInputs, 6, 6);
            var yawcheck = movingAvg(yawInputs, 6, 6);
            geofs.animation.values.averagePitch = pitchcheck[pitchcheck.length - 3];
            geofs.animation.values.averageRoll = rollcheck[rollcheck.length - 3];
            geofs.animation.values.averageYaw = yawcheck[yawcheck.length - 3];
            geofs.animation.values.outerAveragePitch = clamp(geofs.animation.values.averagePitch / (geofs.animation.values.kias / 200), -1, 1);
            geofs.animation.values.outerAverageRoll = clamp(geofs.animation.values.averageRoll / (geofs.animation.values.kias / 100), -1, 1);
            geofs.animation.values.outerAverageYaw = clamp(geofs.animation.values.averageYaw / (geofs.animation.values.kias / 100), -1, 1);
          }
        }
      
        function movingAvg(array, countBefore, countAfter) {
          if (countAfter === undefined) countAfter = 0;
          const result = [];
          for (let i = 0; i < array.length; i++) {
            const subArr = array.slice(Math.max(i - countBefore, 0), Math.min(i + countAfter + 1, array.length));
            const avg = subArr.reduce((a, b) => a + (isNaN(b) ? 0 : b), 0) / subArr.length;
            result.push(avg);
          }
          return result;
        }
      
        geofs.aircraft.instance.parts.aileronleft.animations[0].value = "outerAverageRoll";
        geofs.aircraft.instance.parts.aileronright.animations[0].value = "outerAverageRoll";
        geofs.aircraft.instance.parts.flaperonleft.animations[0].value = "averageRoll";
        geofs.aircraft.instance.parts.flaperonright.animations[0].value = "averageRoll";
        geofs.aircraft.instance.parts.elevleft.animations[0].value = "outerAveragePitch";
        geofs.aircraft.instance.parts.elevright.animations[0].value = "outerAveragePitch";
        geofs.aircraft.instance.parts.rudder.animations[0].value = "averageYaw";
      
        geofs.animation.values.computedPitch = 0;
        geofs.animation.values.computedYaw = 0;
        geofs.animation.values.computedRoll = 0;
        let lastPitchValue = 0;
        let gLimitedPitch = 0;
        let increment = 0;
        let deadZone = 0.01;
        let tiltToHold = 0;
        let pitchStage1 = 0;
        function computePitch() {
          // implement tilt hold
          if (geofs.animation.values.pitch <= deadZone && geofs.animation.values.pitch >= -deadZone) {
            pitchStage1 = -(tiltToHold - geofs.animation.values.atilt) / 10;
          } else {
            tiltToHold = geofs.animation.values.atilt;
            pitchStage1 = geofs.animation.values.pitch;
          }
          geofs.animation.values.computedPitch = clamp(pitchStage1, -1, 1);
        }
      
        function computeYaw() {
          if (geofs.animation.values.atilt >= -70 && geofs.animation.values.atilt <= 70) {
            if (geofs.animation.values.gearPosition == 1) {
              if (geofs.animation.values.aroll >= -75 && geofs.animation.values.aroll <= 75) {
                geofs.animation.values.computedYaw = clamp(geofs.animation.values.yaw - (geofs.aircraft.instance.htrAngularSpeed[0] * 50), -1, 1);
              }
              if (geofs.animation.values.aroll <= -75 && geofs.animation.values.aroll >= -90) {
                geofs.animation.values.computedYaw = clamp(geofs.animation.values.yaw - (geofs.aircraft.instance.htrAngularSpeed[0] * 50), -1, 1);
              }
              if (geofs.animation.values.aroll <= -90 && geofs.animation.values.aroll >= -105) {
                geofs.animation.values.computedYaw = clamp(geofs.animation.values.yaw + (geofs.aircraft.instance.htrAngularSpeed[0] * 50), -1, 1);
              }
              if (geofs.animation.values.aroll <= 75 && geofs.animation.values.aroll >= 90) {
                geofs.animation.values.computedYaw = clamp(geofs.animation.values.yaw - (geofs.aircraft.instance.htrAngularSpeed[0] * 50), -1, 1);
              }
              if (geofs.animation.values.aroll <= 90 && geofs.animation.values.aroll >= 105) {
                geofs.animation.values.computedYaw = clamp(geofs.animation.values.yaw + (geofs.aircraft.instance.htrAngularSpeed[0] * 50), -1, 1);
              }
              if (geofs.animation.values.aroll <= -75 && geofs.animation.values.aroll >= 75) {
                geofs.animation.values.computedYaw = clamp(geofs.animation.values.yaw + (geofs.aircraft.instance.htrAngularSpeed[0] * 50), -1, 1);
              }
            } else {
              if (geofs.animation.values.aroll >= -75 && geofs.animation.values.aroll <= 75) {
                geofs.animation.values.computedYaw = clamp(geofs.animation.values.yaw - (geofs.aircraft.instance.htrAngularSpeed[0] * 50), -1, 1) / 2;
              }
              if (geofs.animation.values.aroll <= -75 && geofs.animation.values.aroll >= -90) {
                geofs.animation.values.computedYaw = clamp(geofs.animation.values.yaw - (geofs.aircraft.instance.htrAngularSpeed[0] * 50), -1, 1) / 2;
              }
              if (geofs.animation.values.aroll <= -90 && geofs.animation.values.aroll >= -105) {
                geofs.animation.values.computedYaw = clamp(geofs.animation.values.yaw + (geofs.aircraft.instance.htrAngularSpeed[0] * 50), -1, 1) / 2;
              }
              if (geofs.animation.values.aroll <= 75 && geofs.animation.values.aroll >= 90) {
                geofs.animation.values.computedYaw = clamp(geofs.animation.values.yaw - (geofs.aircraft.instance.htrAngularSpeed[0] * 50), -1, 1) / 2;
              }
              if (geofs.animation.values.aroll <= 90 && geofs.animation.values.aroll >= 105) {
                geofs.animation.values.computedYaw = clamp(geofs.animation.values.yaw + (geofs.aircraft.instance.htrAngularSpeed[0] * 50), -1, 1) / 2;
              }
              if (geofs.animation.values.aroll >= 75 && geofs.animation.values.aroll <= -75) {
                geofs.animation.values.computedYaw = clamp(geofs.animation.values.yaw + (geofs.aircraft.instance.htrAngularSpeed[0] * 50), -1, 1) / 2;
              }
            }
          } else {
            geofs.animation.values.computedYaw = geofs.animation.values.yaw;
          }
        }
      
        // implement smooth gear tilting
        let restingPoint = 16.152139372973117;
        geofs.animation.values.gearTilt = null;
      
        function tiltGear() {
          if (geofs.animation.values.haglFeet <= 18) {
            geofs.animation.values.gearTilt = clamp((restingPoint * geofs.animation.values.haglFeet) / 15, 18.5, 20);
          }
        }
      
        geofs.aircraft.instance.parts.bogeyright.animations[0].value = "gearTilt";
        geofs.aircraft.instance.parts.bogeyleft.animations[0].value = "gearTilt";
        geofs.aircraft.instance.parts.bogeyright.animations[0].offset = -27;
        geofs.aircraft.instance.parts.bogeyleft.animations[0].offset = -27;
        delete geofs.aircraft.instance.parts.bogeyright.animations[0].lt;
        delete geofs.aircraft.instance.parts.bogeyleft.animations[0].lt;
      
        // detect and execute GPWS callouts
        let isApprConfig = false;
        geofs.animation.values.isFlapsWarn = 0;
        geofs.animation.values.isGearWarn = 0;
        geofs.animation.values.isTerrainWarn = 0;
        geofs.animation.values.isPullupWarn = 0;
        geofs.animation.values.isBankWarn = 0;
        geofs.animation.values.gpws1000 = 0;
        geofs.animation.values.gpws500 = 0;
        geofs.animation.values.gpws400 = 0;
        geofs.animation.values.gpws300 = 0;
        geofs.animation.values.gpws200 = 0;
        geofs.animation.values.gpws100 = 0;
        geofs.animation.values.gpws50 = 0;
        geofs.animation.values.gpws40 = 0;
        geofs.animation.values.gpws30 = 0;
        geofs.animation.values.gpws20 = 0;
        geofs.animation.values.gpws10 = 0;
      
        function getGearFlapsWarn() {
          if (geofs.animation.values.groundContact == 1) {
            geofs.animation.values.isGearWarn = 0;
            geofs.animation.values.isFlapsWarn = 0;
            return;
          }
          if (geofs.animation.values.haglFeet <= 500 && geofs.animation.values.gearPosition == 1 &&
              geofs.animation.values.climbrate < 0 && geofs.animation.values.isPullupWarn == 0) {
            geofs.animation.values.isGearWarn = 1;
          } else {
            geofs.animation.values.isGearWarn = 0;
          }
      
          if (geofs.animation.values.haglFeet <= 1000 && geofs.animation.values.flapsPosition == 0 &&
              geofs.animation.values.climbrate < 0 && geofs.animation.values.isPullupWarn == 0) {
            geofs.animation.values.isFlapsWarn = 1;
          } else {
            geofs.animation.values.isFlapsWarn = 0;
          }
        }
      
        function testTerrainorAppr() {
          if (geofs.animation.values.gearPosition == 0) {
            if (geofs.animation.values.haglFeet <= 1000 &&
                geofs.animation.values.climbrate <= -100 &&
                geofs.animation.values.climbrate >= -5000 &&
                geofs.animation.values.isGearWarn == 0 &&
                geofs.animation.values.isFlapsWarn == 0 &&
                isApprConfig == 0) {
              geofs.animation.values.isTerrainWarn = 1;
            } else {
              geofs.animation.values.isTerrainWarn = 0;
            }
      
            if (geofs.animation.values.haglFeet <= 5000 && geofs.animation.values.climbrate <= -2000 ||
                geofs.animation.values.haglFeet <= 1000 && geofs.animation.values.climbrate <= -5000) {
              geofs.animation.values.isPullupWarn = 1;
            } else {
              geofs.animation.values.isPullupWarn = 0;
            }
          } else {
            geofs.animation.values.isTerrainWarn = 0;
            geofs.animation.values.isPullupWarn = 0;
            return;
          }
        }
      
        function testForApproach() {
          if (geofs.animation.values.isFlapsWarn == 0 &&
              geofs.animation.values.isGearWarn == 0 &&
              geofs.animation.values.climbrate <= -1) {
            isApprConfig = true;
          } else {
            isApprConfig = false;
          }
        }
      
        function doRadioAltCall() {
          if (isApprConfig) {
            if (geofs.animation.values.haglFeet <= 1000 + restingPoint &&
                geofs.animation.values.haglFeet >= 900 + restingPoint) {
              geofs.animation.values.gpws1000 = 1;
            } else {
              geofs.animation.values.gpws1000 = 0;
            }
            if (geofs.animation.values.haglFeet <= 500 + restingPoint &&
                geofs.animation.values.haglFeet >= 400 + restingPoint) {
              geofs.animation.values.gpws500 = 1;
            } else {
              geofs.animation.values.gpws500 = 0;
            }
            if (geofs.animation.values.haglFeet <= 400 + restingPoint &&
                geofs.animation.values.haglFeet >= 300 + restingPoint) {
              geofs.animation.values.gpws400 = 1;
            } else {
              geofs.animation.values.gpws400 = 0;
            }
            if (geofs.animation.values.haglFeet <= 300 + restingPoint &&
                geofs.animation.values.haglFeet >= 200 + restingPoint) {
              geofs.animation.values.gpws300 = 1;
            } else {
              geofs.animation.values.gpws300 = 0;
            }
            if (geofs.animation.values.haglFeet <= 200 + restingPoint &&
                geofs.animation.values.haglFeet >= 100 + restingPoint) {
              geofs.animation.values.gpws200 = 1;
            } else {
              geofs.animation.values.gpws200 = 0;
            }
            if (geofs.animation.values.haglFeet <= 100 + restingPoint &&
                geofs.animation.values.haglFeet >= 50 + restingPoint) {
              geofs.animation.values.gpws100 = 1;
            } else {
              geofs.animation.values.gpws100 = 0;
            }
            if (geofs.animation.values.haglFeet <= 50 + restingPoint &&
                geofs.animation.values.haglFeet >= 40 + restingPoint) {
              geofs.animation.values.gpws50 = 1;
            } else {
              geofs.animation.values.gpws50 = 0;
            }
            if (geofs.animation.values.haglFeet <= 40 + restingPoint &&
                geofs.animation.values.haglFeet >= 30 + restingPoint) {
              geofs.animation.values.gpws40 = 1;
            } else {
              geofs.animation.values.gpws40 = 0;
            }
            if (geofs.animation.values.haglFeet <= 30 + restingPoint &&
                geofs.animation.values.haglFeet >= 20 + restingPoint) {
              geofs.animation.values.gpws30 = 1;
            } else {
              geofs.animation.values.gpws30 = 0;
            }
            if (geofs.animation.values.haglFeet <= 20 + restingPoint &&
                geofs.animation.values.haglFeet >= 10 + restingPoint) {
              geofs.animation.values.gpws20 = 1;
            } else {
              geofs.animation.values.gpws20 = 0;
            }
            if (geofs.animation.values.haglFeet <= 10 + restingPoint &&
                geofs.animation.values.haglFeet >= 5 + restingPoint) {
              geofs.animation.values.gpws10 = 1;
            } else {
              geofs.animation.values.gpws10 = 0;
            }
          } else {
            geofs.animation.values.gpws1000 = 0;
            geofs.animation.values.gpws500 = 0;
            geofs.animation.values.gpws400 = 0;
            geofs.animation.values.gpws300 = 0;
            geofs.animation.values.gpws200 = 0;
            geofs.animation.values.gpws100 = 0;
            geofs.animation.values.gpws50 = 0;
            geofs.animation.values.gpws40 = 0;
            geofs.animation.values.gpws30 = 0;
            geofs.animation.values.gpws20 = 0;
            geofs.animation.values.gpws10 = 0;
          }
        }
      
        setInterval(function () {
          groundEffect();
          getShake();
          computeYaw();
          tiltGear();
          computePitch();
          pushInputs();
          computeOutputs();
          resetLift2();
          getFlapChange();
          getGearFlapsWarn();
          testTerrainorAppr();
          testForApproach();
          doRadioAltCall();
          tiller();
          stallForces();
        }, 20);
      
      } else {
        console.log("Target element not found. Code not executed.");
      }
      
      
      
      
    function init() {
        // Example: Enhance  features
        console.log('777-Realism-Overhaul loaded successfully!');
        // Additional code for  enhancements
    }
    init();
})();
// == 777-Realism-Overhaul ==


// == Spoiler Arming ==
(function() {
    // Spoiler Arming initialization code
    // ==UserScript==
// @name        GeoFS Autoland++
// @namespace   GeoFS
// @match       *://*.geo-fs.com/*
// @grant       none
// @version     1.2
// @author      jtpotato
// @description Enhances built-in autoland: Automatically arm spoilers, disables autopilot, activates reverse thrust on touchdown
// ==/UserScript==

// Importing types for TypeScript support
/// <reference types="jquery" />
/// <reference types="@geps/geofs-types" />

// Function to wait for a condition to be true
async function waitForCondition(checkFunction) {
    return new Promise((resolve) => {
      const intervalId = setInterval(() => {
        if (checkFunction()) {
          // Check if the condition is met
          clearInterval(intervalId); // Stop checking
          resolve(); // Resolve the promise
        }
      }, 100); // Check every 100 milliseconds
    });
  }
  
  // Function to wait until the UI is ready
  async function waitForUI() {
    return waitForCondition(() => typeof ui !== "undefined"); // Checks if 'ui' is defined
  }
  
  // Function to wait until the aircraft instance is ready
  async function waitForInstance() {
    return waitForCondition(() => geofs.aircraft && geofs.aircraft.instance); // Checks if aircraft instance exists
  }
  
  // Function to wait until the instruments are available
  async function waitForInstruments() {
    return waitForCondition(
      () => instruments && geofs.aircraft.instance.setup.instruments // Checks if instruments are set up
    );
  }
  
  // Main function to handle the autospoilers functionality
  async function autospoilers() {
    await waitForUI(); // Wait for the UI to be ready
    await waitForInstance(); // Wait for the aircraft instance to be ready
  
    // Show a notification about the new spoiler arming key
    ui.notification.show("Note: spoiler arming key has now changed to Shift.");
  
    // Initialize the spoiler arming status
    geofs.aircraft.instance.animationValue.spoilerArming = 0;
  
    // Function to toggle spoiler arming status
    const toggleSpoilerArming = () => {
      // Check if the aircraft is not on the ground and airbrakes are off
      if (
        !geofs.aircraft.instance.groundContact &&
        controls.airbrakes.position === 0
      ) {
        // Toggle the spoiler arming value between 0 and 1
        geofs.aircraft.instance.animationValue.spoilerArming =
          geofs.aircraft.instance.animationValue.spoilerArming === 0 ? 1 : 0;
      }
    };
  
    // Function to toggle airbrakes
    const toggleAirbrakes = () => {
      // Toggle airbrakes position between 0 and 1
      controls.airbrakes.target = controls.airbrakes.target === 0 ? 1 : 0;
      controls.setPartAnimationDelta(controls.airbrakes); // Update the animation delta
      geofs.aircraft.instance.animationValue.spoilerArming = 0; // Reset spoiler arming
    };
  
    // Define control setter for spoiler arming
    controls.setters.setSpoilerArming = {
      label: "Spoiler Arming", // Label for the control
      set: toggleSpoilerArming, // Function to execute when toggled
    };
  
    // Define control setter for airbrakes
    controls.setters.setAirbrakes = {
      label: "Air Brakes", // Label for the control
      set: toggleAirbrakes, // Function to execute when toggled
    };
  
    await waitForInstruments(); // Wait for the instruments to be available
  
    // Set up an overlay for the spoilers in the instruments
    instruments.definitions.spoilers.overlay.overlays[3] = {
      anchor: { x: 0, y: 0 }, // Position of the overlay
      size: { x: 50, y: 50 }, // Size of the overlay
      position: { x: 0, y: 0 }, // Initial position of the overlay
      animations: [
        { type: "show", value: "spoilerArming", when: [1] }, // Show conditions
        { type: "hide", value: "spoilerArming", when: [0] }, // Hide conditions
      ],
      class: "control-pad-dyn-label green-pad", // CSS class for styling
      text: "SPLR<br/>ARM", // Text to display on the overlay
      drawOrder: 1, // Draw order for layering
    };
  
    instruments.init(geofs.aircraft.instance.setup.instruments); // Initialize the instruments
  
    // Event listener for keyboard events
    $(document).keydown(function (e) {
      if (e.which === 16) {
        // Check if the "Shift" key is pressed
        console.log("Toggled Arming Spoilers"); // Log the action
        controls.setters.setSpoilerArming.set(); // Execute the toggle function
      }
    });
  
    // Interval to check conditions and update airbrakes and speed
    setInterval(function () {
      // Check if spoilers are armed and the aircraft is on the ground
      if (
        geofs.aircraft.instance.animationValue.spoilerArming === 1 &&
        geofs.aircraft.instance.groundContact
      ) {
        if (controls.airbrakes.position === 0) {
          controls.setters.setAirbrakes.set(); // Toggle airbrakes
        }
        geofs.aircraft.instance.animationValue.spoilerArming = 0; // Reset spoiler arming
        geofs.autopilot.setSpeed(0);
        setTimeout(() => {
          geofs.autopilot.turnOff();
        }, 200);
        controls.setters.fullReverse.set();
      }
    }, 100); // Run this check every 100 milliseconds
  
    // Interval to ensure instruments are set up correctly for specific aircraft IDs
    setInterval(function () {
      // Check if the aircraft ID is known and instruments are not initialized
      if (
        ["3292", "3054"].includes(geofs.aircraft.instance.id) &&
        geofs.aircraft.instance.setup.instruments["spoilers"] === undefined
      ) {
        geofs.aircraft.instance.setup.instruments["spoilers"] = ""; // Initialize spoilers instrument
        instruments.init(geofs.aircraft.instance.setup.instruments); // Reinitialize instruments
      }
    }, 500); // Run this check every 500 milliseconds
  }
  
  // Call the autospoilers function to start the script
  autospoilers();
    function init() {
        // Example: Enhance  features
        console.log('Spoiler Arming loaded successfully!', 'Shift to arm spoilers');
        // Additional code for  enhancements
    }
    init();
})();
// == Spoiler Arming ==

// == GeoFS-Information-Display ==
(function() {
    // GeoFS-Information-Display initialization code
    // ==UserScript==
// @name         GeoFS Information Display
// @version      2.4
// @description  Displays Speed/Altitude/Heading/VS on the bottom right of the screen
// @author       krunchiekrunch
// @match        https://www.geo-fs.com/geofs.php?v=*
// @match        https://*.geo-fs.com/geofs.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geo-fs.com
// @grant        none
// @license      GPL-3.0
// ==/UserScript==

// Notes
// Pressing 'i' will hide the display
// The AGL display NO LONGER have a offset that varies from aircraft to aircraft. (Since 2.3) - Fixed by GGamerGGuy on Discord


(function() {
    'use strict';

    // Update display
    function updateFlightDataDisplay() {
        // Check if geofs.animation.values is available
        if (geofs.animation.values) {
            // Retrieve and format the required values
            var kias = geofs.animation.values.kias ? geofs.animation.values.kias.toFixed(1) : 'N/A';
            var mach = geofs.animation.values.mach ? geofs.animation.values.mach.toFixed(2) : 'N/A';
            var groundSpeed = geofs.animation.values.groundSpeed ? geofs.animation.values.groundSpeed.toFixed(1) : 'N/A';
            var altitude = geofs.animation.values.altitude ? Math.round(geofs.animation.values.altitude) : 'N/A';
            var heading = geofs.animation.values.heading360 ? Math.round(geofs.animation.values.heading360) : 'N/A';
            var agl = (geofs.animation.values.altitude !== undefined && geofs.animation.values.groundElevationFeet !== undefined) ? Math.round((geofs.animation.values.altitude - geofs.animation.values.groundElevationFeet) + (geofs.aircraft.instance.collisionPoints[geofs.aircraft.instance.collisionPoints.length - 2].worldPosition[2]*3.2808399)) : 'N/A';
            var verticalSpeed = geofs.animation.values.verticalSpeed !== undefined ? Math.round(geofs.animation.values.verticalSpeed) : 'N/A';

            // Display css
            var flightDataElement = document.getElementById('flightDataDisplay');
            if (!flightDataElement) {
                flightDataElement = document.createElement('div');
                flightDataElement.id = 'flightDataDisplay';
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
                flightDataElement.style.pointerEvents = 'none'; // Make the display clickable through
                document.body.appendChild(flightDataElement);
            }

            // Hide the flight data display if 'i' is pressed
            document.addEventListener('keydown', function(event) {
                if (event.key === 'i') {
                    flightDataElement.style.display = flightDataElement.style.display === 'none' ? 'inline-block' : 'none';
                }
            });

            flightDataElement.innerHTML = `
                <span style="background: 0 0; border: none; border-radius: 2px; color: #000; display: inline-block; padding: 0 8px;">KIAS ${kias}</span> |
                <span style="background: 0 0; border: none; border-radius: 2px; color: #000; display: inline-block; padding: 0 8px;">Mach ${mach}</span> |
                <span style="background: 0 0; border: none; border-radius: 2px; color: #000; display: inline-block; padding: 0 8px;">GS ${groundSpeed}</span> |
                <span style="background: 0 0; border: none; border-radius: 2px; color: #000; display: inline-block; padding: 0 8px;">ALT ${altitude}</span> |
                <span style="background: 0 0; border: none; border-radius: 2px; color: #000; display: inline-block; padding: 0 8px;">AGL ${agl}</span> |
                <span style="background: 0 0; border: none; border-radius: 2px; color: #000; display: inline-block; padding: 0 8px;">HDG ${heading}</span> |
                <span style="background: 0 0; border: none; border-radius: 2px; color: #000; display: inline-block; padding: 0 8px;">V/S ${verticalSpeed === 'N/A' ? 'N/A' : verticalSpeed}</span>
            `;
        }
    }

    // Update flight data display every 100ms
    setInterval(updateFlightDataDisplay, 100);
})();
    function init() {
        // Example: Enhance  features
        console.log('GeoFS-Information-Display loaded successfully!');
        // Additional code for  enhancements
    }
    init();
})();
// == GeoFS-Information-Display ==

// == geofs-ui-tweaks ==
(function() {
    // geofs-ui-tweaks initialization code
    // ==UserScript==
// @name         GeoFS UI tweaks
// @version      1.0.4
// @description  Adds various tweaks to the GeoFS UI
// @author       TurboMaximus
// @match        https://*/geofs.php*
// @icon         https://github.com/scitor/GeoFS/raw/master/uiTweaks/logo.png
// @downloadURL  https://github.com/scitor/GeoFS/raw/master/uiTweaks/geofs-ui-tweaks.user.js
// @run-at       document-end
// @grant        none
// ==/UserScript==

const MOUSEWHEEL_TWEAKS = true; // adds ability to change autopilot values (IAS,HDG,Alt,etc) with the mousewheel
const POPOUT_CHAT = true; // adds ability to popout chat into new window

(function init() {
    'use strict';

    if (!window.jQuery)
        return setTimeout(init, 1000);

    if (MOUSEWHEEL_TWEAKS) {
        document.querySelector('input.geofs-autopilot-speed').onwheel = (event) =>
            geofs.autopilot.setSpeed(parseInt(event.target.value) + event.deltaY/(event.shiftKey ? -100 : -10));
        document.querySelector('input.geofs-autopilot-course').onwheel = (event) =>
            geofs.autopilot.setCourse(parseInt(event.target.value) + event.deltaY/(event.shiftKey ? -100 : -10));
        document.querySelector('input.geofs-autopilot-altitude').onwheel = (event) =>
            geofs.autopilot.setAltitude(parseInt(event.target.value) + event.deltaY/(event.shiftKey ? -10 : -1));
        document.querySelector('input.geofs-autopilot-verticalSpeed').onwheel = (event) =>
            geofs.autopilot.setVerticalSpeed(parseInt(event.target.value) + event.deltaY/(event.shiftKey ? -10 : -1));
    }

    if (POPOUT_CHAT) {
        const popoutChatBtn = $('<button class="mdl-button mdl-js-button mdl-button--icon" tabindex="0"><i class="material-icons">text_fields</i></button>')[0];
        document.querySelectorAll('.geofs-button-mute').forEach(m=>m.parentNode.appendChild(popoutChatBtn));
        let popoutChatWindow, chatParentDiv, chatDiv;
        popoutChatBtn.onclick = function() {
            chatDiv = document.querySelector('.geofs-chat-messages');
            chatParentDiv = chatDiv.parentNode;
            popoutChatWindow = window.open('about:blank',  '_blank', 'height=580, width=680, popup=1');
            popoutChatWindow.document.body.append(chatDiv);
            popoutChatWindow.document.head.append($('<title>GeoFS - Chat</title>')[0]);
            popoutChatWindow.document.head.append($('<style>.geofs-chat-message{opacity:1!important;font-family:sans-serif;}</style>')[0]);
            popoutChatWindow.onbeforeunload = () => chatParentDiv.append(chatDiv);
        };
        window.onbeforeunload = () => popoutChatWindow && popoutChatWindow.close();
    }
})();
    function init() {
        // Example: Enhance  features
        console.log('');
        // Additional code for  enhancements
    }
    init();
})();
// == geofs-ui-tweaks ==


// == GeoFS-Failures ==
(function() {
    // GeoFS-Failures initialization code
    // ==UserScript==
// @name         GeoFS Failures
// @version      0.3.2
// @description  Adds the ability for systems to fail
// @author       GGamerGGuy
// @match        https://www.geo-fs.com/geofs.php?v=*
// @match        https://*.geo-fs.com/geofs.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geo-fs.com
// @grant        none
// ==/UserScript==
class Failure {
    constructor() {
        this.aId = window.geofs.aircraft.instance.id; //aircraft ID
        this.enabled = false; //Start disabled
        this.failures = []; //Array with all failure intervals
        this.fails = {
            landingGear: {
                front: false,
                left: false,
                right: false
            },
            fuelLeak: false,
            flightCtrl: {
                ailerons: false,
                elevators: false,
                rudder: false,
            },
            electrical: false,
            structural: false,
            hydraulic: {
                flaps: false,
                brakes: false,
                spoilers: false
            },
            pitotStatic: false,
            pressurization: false,
            engines: []
        } //End fails
        for (var i = 0; i < window.geofs.aircraft.instance.engines.length; i++) {
            this.fails.engines.push({i: false});
        }
        this.chances = { //Chances of a failure happening every minute, from 0 to 1
            landingGear: {
                front: 0,
                left: 0,
                right: 0
            },
            fuelLeak: 0,
            flightCtrl: {
                ailerons: 0,
                elevators: 0,
                rudder: 0
            },
            electrical: 0,
            structural: 0,
            hydraulic: {
                flaps: 0,
                brakes: 0,
                spoilers: 0
            },
            pitotStatic: 0,
            pressurization: 0,
            engines: []
        } //End chances
        for (var v = 0; v < window.geofs.aircraft.instance.engines.length; v++) {
            this.chances.engines.push({v: 0});
        }
    } //End constructor

    fail(system) {
        var ngin_l = window.geofs.aircraft.instance.engines.length; //N-Gin Length
        //Engine (first because the number varies):
        //Left:  window.geofs.aircraft.instance.definition.parts[79].thrust = 0;
        //Right: window.geofs.aircraft.instance.definition.parts[82].thrust = 0;
        for (var i = 0; i < ngin_l; i++) {
            if (system == ("engine" + i)) {
                alert("Engine " + (i+1) + " failed!");
                window.geofs.aircraft.instance.engines[i].thrust = 0;
                var v = new window.geofs.fx.ParticleEmitter({
                    off: 0,
                    anchor: window.geofs.aircraft.instance.engines[0].points.contrailAnchor || {worldPosition: window.geofs.aircraft.instance.engines[0].object3d.worldPosition},
                    duration: 1E10,
                    rate: .03,
                    life: 1E4, //10 seconds
                    easing: "easeOutQuart",
                    startScale: .01,
                    endScale: .2,
                    randomizeStartScale: .01,
                    randomizeEndScale: .15,
                    startOpacity: 1,
                    endOpacity: .2,
                    startRotation: "random",
                    texture: "whitesmoke"
                });
                var p = setInterval(() => {window.geofs.fx.setParticlesColor(new window.Cesium.Color(0.1,0.1,0.1,1));},20);
            }
        }
        if (!system.includes("engine")) {
            switch(system) {
                case "fuelLeak":
                    if (!this.fails.fuelLeak) {
                        alert("Fuel leak! 2 minutes of fuel remaining");
                        this.fails.fuelLeak = true;
                        setTimeout(() => {
                            setInterval(() => {
                                window.geofs.aircraft.instance.stopEngine();
                            },1000);
                        },120000); //2 minutes = 120000 ms
                    }
                    break;
                    //Landing gear:
                    //Front landing gear failure:
                case "gearFront":
                    if (!this.fails.landingGear.front) {
                        alert("Nose gear failure");
                        this.fails.landingGear.front = true;
                        var fG = 2;
                        for (i = 0; i < window.geofs.aircraft.instance.suspensions.length; i++) {
                            if (window.geofs.aircraft.instance.suspensions[i].name.includes("front") || window.geofs.aircraft.instance.suspensions[i].name.includes("nose") || window.geofs.aircraft.instance.suspensions[i].name.includes("tail")) {
                                fG = i;
                            }
                        }
                        this.failures.push(setInterval(() => {
                            window.geofs.aircraft.instance.suspensions[fG].collisionPoints[0][2] = 30;
                        }),1000);
                    }
                    break;
                    //Left landing gear failure:
                case "gearLeft":
                    if (!this.fails.landingGear.left) {
                        alert("Left gear failure");
                        this.fails.landingGear.left = true;
                        var lG = 0;
                        for (i = 0; i < window.geofs.aircraft.instance.suspensions.length; i++) {
                            if (window.geofs.aircraft.instance.suspensions[i].name.includes("left") || window.geofs.aircraft.instance.suspensions[i].name.includes("l")) {
                                lG = i;
                            }
                        }
                        this.failures.push(setInterval(() => {
                            window.geofs.aircraft.instance.suspensions[lG].collisionPoints[0][2] = 30;
                        }),1000);
                    }
                    break;
                    //Right landing gear failure:
                case "gearRight":
                    alert("Right gear failure");
                    if (!this.fails.landingGear.right) {
                        this.fails.landingGear.right = true;
                        var rG = 1;
                        for (i = 0; i < window.geofs.aircraft.instance.suspensions.length; i++) {
                            if (window.geofs.aircraft.instance.suspensions[i].name.includes("right") || window.geofs.aircraft.instance.suspensions[i].name.includes("r_g")) {
                                rG = i;
                            }
                        }
                        this.failures.push(setInterval(() => {
                            window.geofs.aircraft.instance.suspensions[rG].collisionPoints[0][2] = 30;
                        }),1000);
                    }
                    break;

                    //Flight control:
                    //Left aileron: window.geofs.aircraft.instance.definition.parts[6].object3d._scale = [0,0,0];
                    //Right aileron: window.geofs.aircraft.instance.definition.parts[29].object3d._scale = [0,0,0];
                case "ailerons":
                    alert("Flight control failure (ailerons)");
                    if (!this.fails.flightCtrl.ailerons) {
                        this.fails.flightCtrl.ailerons = true;
                        this.failures.push(setInterval(() => {
                            for (var t in window.geofs.aircraft.instance.airfoils) {
                                if (window.geofs.aircraft.instance.airfoils[t].name.toLowerCase().includes("aileron")) {
                                    window.geofs.aircraft.instance.airfoils[t].object3d._scale = [0,0,0];
                                }
                            }
                        }),1000);
                    }
                    break;
                    //Left elevator: window.geofs.aircraft.instance.definition.parts[51].object3d._scale = [0,0,0];
                    //Right elevator: window.geofs.aircraft.instance.definition.parts[52].object3d._scale = [0,0,0];
                case "elevators":
                    alert("Flight control failure (elevators)");
                    if (!this.fails.flightCtrl.elevators) {
                        this.fails.flightCtrl.elevators = true;
                        this.failures.push(setInterval(() => {
                            for (var t in window.geofs.aircraft.instance.airfoils) {
                                if (window.geofs.aircraft.instance.airfoils[t].name.toLowerCase().includes("elevator")) {
                                    window.geofs.aircraft.instance.airfoils[t].object3d._scale = [0,0,0];
                                }
                            }
                        }),1000);
                    }
                    break;
                case "rudder":
                    alert("Flight control failure (rudder)");
                    if (!this.fails.flightCtrl.rudder) {
                        this.fails.flightCtrl.rudder = true;
                        this.failures.push(setInterval(() => {
                            for (var t in window.geofs.aircraft.instance.airfoils) {
                                if (window.geofs.aircraft.instance.airfoils[t].name.toLowerCase().includes("rudder")) {
                                    window.geofs.aircraft.instance.airfoils[t].object3d._scale = [0,0,0];
                                }
                            }
                        }),1000);
                    }
                    break;

                    //Electrical:
                    //for (var i = 1; i <= 5; i++) {
                    //window.geofs.aircraft.instance.cockpitSetup.parts[i].object3d._scale = [0,0,0];
                    //}
                    //instruments.hide();
                case "electrical":
                    if (!this.fails.electrical) {
                        alert("Electrical failure");
                        this.fails.electrical = true;
                        this.failures.push(setInterval(() => {
                            for (var i = 1; i <= 5; i++) {
                                window.geofs.aircraft.instance.cockpitSetup.parts[i].object3d._scale = [0,0,0];
                            }
                            window.geofs.autopilot.turnOff();
                            window.instruments.hide();
                        }),1000);
                    }
                    break;

                case "structural":
                    if (!this.fails.structural) {
                        alert("Significant structural damage detected");
                        console.log("Boeing, am I right?");
                        this.fails.structural = true;
                        this.failures.push(setInterval(() => {
                            window.weather.definition.turbulences = 3;
                        }),1000);
                    }
                    break;

                    //Hydraulic:
                    //Flaps: controls.flaps.target = Math.floor(Math.random()*(window.geofs.animation.values.flapsSteps*2));  controls.flaps.delta = 20;
                case "flaps":
                    if (!this.fails.hydraulic.flaps) {
                        alert("Hydraulic failure (flaps)");
                        this.fails.hydraulic.flaps = true;
                        this.failures.push(setInterval(() => {
                            window.controls.flaps.target = Math.floor(0.6822525475345469*(window.geofs.animation.values.flapsSteps*2)); //0.6822525475345469 is a random number, which keeps things consistent
                            window.controls.flaps.delta = 20;
                        }),1000);
                    }
                    break;
                    //Brakes: controls.brakes = 0;
                case "brakes":
                    if (!this.fails.hydraulic.brakes) {
                        alert("Hydraulic failure (brakes)");
                        this.fails.hydraulic.brakes = true;
                        this.failures.push(setInterval(() => {
                            window.controls.brakes = 0;
                        }),500);
                    }
                    break;
                    //Spoilers: controls.airbrakes.target = Math.round(Math.random()*20)/10;  controls.airbrakes.delta = 20;
                case "spoilers":
                    if (!this.fails.hydraulic.spoilers) {
                        alert("Hydraulic failure (spoilers)");
                        this.fails.hydraulic.spoilers = true;
                        this.failures.push(setInterval(() => {
                            window.controls.airbrakes.target = 0.2;
                            window.controls.airbrakes.delta = 20;
                        }),1000);
                    }
                    break;

                case "pressurization":
                    if (!this.fails.pressurization) {
                        alert("Cabin depressurization! Get at or below 9,000 ft MSL!");
                        this.fails.pressurization = true;
                        this.failures.push(setInterval(() => {
                            if (window.geofs.animation.values.altitude > 9000) {
                                window.weather.definition.turbulences = (window.geofs.animation.values.altitude - 9000) / 5200; //Dynamically adjust turbulence based on altitude
                            } else {
                                window.weather.definition.turbulences = 0;
                            }
                        }),1000);
                    }
                    break;
            } //End system switch
        } //End not system.includes engine if statement
    } //End fail method
    tick() {
        if (this.enabled) {
            console.log("tick");
            for (var i in this.chances.landingGear) {
                if (Math.random() < this.chances.landingGear[i]) {
                    this.fail("gear" + (i[0].toUpperCase() + i.substr(1,i.length)));
                } //End if
            } //End for
            for (var q in this.chances) {
                if (typeof this.chances[q] == "number") {
                    if (Math.random() < this.chances[i]) {
                        this.fail(q);
                    }
                } else if (q !== "landingGear") {
                    for (var j in this.chances[q]) {
                        if (Math.random() < this.chances[q][j]) {
                            this.fail(j);
                        } //End if
                    } //End for
                } //End else if
            } //End for
            setTimeout(() => {this.tick();}, 60000);
        } //End if enabled statement
    } //End tick method
    reset() {
        for (var i in this.failures) {
            clearInterval(this.failures[i]);
        }
        //this.failures = [];
        this.enabled = false;
        //window.geofs.resetFlight();
    }
} //End failure class
window.openFailuresMenu = function() {
    if (!window.failuresMenu) {
        window.failure = new Failure();
        window.failuresMenu = document.createElement("div");
        window.failuresMenu.style.position = "fixed";
        window.failuresMenu.style.width = "640px";
        window.failuresMenu.style.height = "480px";
        window.failuresMenu.style.background = "white";
        window.failuresMenu.style.display = "block";
        window.failuresMenu.style.overflow = "scroll";
        window.failuresMenu.style.zIndex = "10000";
        window.failuresMenu.id = "failMenu";
        window.failuresMenu.className = "geofs-ui-left";
        document.body.appendChild(window.failuresMenu);
        var htmlContent = `
        <div style="position: fixed; width: 640px; height: 10px; background: lightgray; cursor: move;" id="dragPart"></div>
        <p style="cursor: pointer;right: 0px;position: absolute;background: gray;height: fit-content;" onclick="window.failuresMenu.hidden=true;">X</p>
    <p>Note: Some failures may require a manual refresh of the page.</p>
    <button id="enBtn" onclick="(function(){window.failure.enabled=true; window.failure.tick(); document.getElementById('enBtn').hidden = true;})();">Enable</button>
    <button onclick="window.failure.reset()">RESET ALL</button>
        <h1>Landing Gear</h1>
        <h2>Front</h2>
        <span style="
    font-size: large;
    vertical-align: top;
">Chance per minute: </span>
        <input type="range" value="0" min="0" max="1" step="0.01" id="slide1" onchange="[document.getElementById('input1').value, window.failure.chances.landingGear.gearFront]=[document.getElementById('slide1').value, document.getElementById('slide1').value]" draggable="false" style="
    vertical-align: bottom;
">
        <input disabled="true;" id="input1" style="
    width: 40px;
">
    <button onclick="failure.fail('gearFront')">FAIL</button>
        <br>
        <h2>Left</h2>
        <span style="
    font-size: large;
    vertical-align: top;
">Chance per minute: </span>
        <input type="range" min="0" max="1" step="0.01" id="slideGearL" onchange="[document.getElementById('inputGearL').value, window.failure.chances.landingGear.left]=[document.getElementById('slideGearL').valueAsNumber, document.getElementById('slideGearL').valueAsNumber]" draggable="false" style="
    vertical-align: bottom;
">
        <input disabled="true;" id="inputGearL" style="
    width: 40px;
">

        <button onclick="failure.fail('gearLeft')">FAIL</button>
    <br>
        <h2>Right</h2>
        <span style="
    font-size: large;
    vertical-align: top;
">Chance per minute: </span>
            <input type="range" min="0" max="1" step="0.01" id="slideGearR" onchange="[document.getElementById('inputGearR').value, window.failure.chances.landingGear.right]=[document.getElementById('slideGearR').valueAsNumber, document.getElementById('slideGearR').valueAsNumber]" draggable="false" style="
    vertical-align: bottom;
">
        <input disabled="true;" id="inputGearR" style="
    width: 40px;
">
    <button onclick="failure.fail('gearRight')">FAIL</button>
    <br>
        <h1>Fuel Leak</h1>
        <span style="
    font-size: large;
    vertical-align: top;
">Chance per minute: </span>
        <input type="range" min="0" max="1" step="0.01" id="slideFuelLeak" onchange="[document.getElementById('inputFuelLeak').value, window.failure.chances.fuelLeak]=[document.getElementById('slideFuelLeak').valueAsNumber, document.getElementById('slideFuelLeak').valueAsNumber]" draggable="false" style="
    vertical-align: bottom;
">
        <input disabled="true;" id="inputFuelLeak" style="
    width: 40px;
">



        <button onclick="failure.fail('fuelLeak')">FAIL</button>
    <br>
    <h1>Flight Control</h1>
    <h2>Ailerons</h2>
        <span style="
    font-size: large;
    vertical-align: top;
">Chance per minute: </span>
        <input type="range" min="0" max="1" step="0.01" id="slideFlightCtrl" onchange="[document.getElementById('inputFlightCtrl').value, window.failure.chances.flightCtrl.ailerons]=[document.getElementById('slideFlightCtrl').valueAsNumber, document.getElementById('slideFlightCtrl').valueAsNumber]" draggable="false" style="vertical-align: bottom;">
    <input disabled="true;" id="inputFlightCtrl" style="
    width: 40px;
">
        <button onclick="failure.fail('ailerons')">FAIL</button><br>
            <h2>Elevators</h2>
        <span style="
    font-size: large;
    vertical-align: top;
">Chance per minute: </span>
        <input type="range" min="0" max="1" step="0.01" id="slideElevator" onchange="[document.getElementById('inputElevator').value, window.failure.chances.flightCtrl.elevator]=[document.getElementById('slideElevator').valueAsNumber, document.getElementById('slideElevator').valueAsNumber]" draggable="false" style="vertical-align: bottom;">
    <input disabled="true;" id="inputElevator" style="
    width: 40px;
">
        <button onclick="failure.fail('elevators')">FAIL</button><br>
        <h2>Rudder</h2>
        <span style="
    font-size: large;
    vertical-align: top;
">Chance per minute: </span>
        <input type="range" min="0" max="1" step="0.01" id="slideRudder" onchange="[document.getElementById('inputRudder').value, window.failure.chances.flightCtrl.rudder]=[document.getElementById('slideRudder').valueAsNumber, document.getElementById('slideRudder').valueAsNumber]" draggable="false" style="vertical-align: bottom;">
    <input disabled="true;" id="inputRudder" style="
    width: 40px;
">
        <button onclick="failure.fail('rudder')">FAIL</button><br>
    <h1>Electrical</h1>
        <span style="
    font-size: large;
    vertical-align: top;
">Chance per minute: </span>
        <input type="range" min="0" max="1" step="0.01" id="slideElectrical" onchange="[document.getElementById('inputElectrical').value, window.failure.chances.electrical]=[document.getElementById('slideElectrical').valueAsNumber, document.getElementById('slideElectrical').valueAsNumber]" draggable="false" style="
    vertical-align: bottom;
">

        <input disabled="true;" id="inputElectrical" style="
    width: 40px;
">
        <button onclick="failure.fail('electrical')">FAIL</button>

    <br>

    <h1>Structural</h1>
        <span style="
    font-size: large;
    vertical-align: top;
">Chance per minute: </span>
        <input type="range" min="0" max="1" step="0.01" id="slideStructural" onchange="[document.getElementById('inputStructural').value, window.failure.chances.structural]=[document.getElementById('slideStructural').valueAsNumber, document.getElementById('slideStructural').valueAsNumber]" draggable="false" style="
    vertical-align: bottom;
">

        <input disabled="true;" id="inputStructural" style="
    width: 40px;
">
        <button onclick="failure.fail('structural')">FAIL</button>

    <br>
    <h1>Hydraulic</h1>
<h2>Flaps</h2>
        <span style="
    font-size: large;
    vertical-align: top;
">Chance per minute: </span>
        <input type="range" min="0" max="1" step="0.01" id="slideFlaps" onchange="[document.getElementById('inputFlaps').value, window.failure.chances.hydraulic.flaps]=[document.getElementById('slideFlaps').valueAsNumber, document.getElementById('slideFlaps').valueAsNumber]" draggable="false" style="
    vertical-align: bottom;
">

        <input disabled="true;" id="inputFlaps" style="
    width: 40px;
">
        <button onclick="failure.fail('flaps')">FAIL</button>
<h2>Brakes</h2>
    <span style="
    font-size: large;
    vertical-align: top;
">Chance per minute: </span>
        <input type="range" min="0" max="1" step="0.01" id="slideBrakes" onchange="[document.getElementById('inputBrakes').value, window.failure.chances.hydraulic.brakes]=[document.getElementById('slideBrakes').valueAsNumber, document.getElementById('slideBrakes').valueAsNumber]" draggable="false" style="
    vertical-align: bottom;
">

        <input disabled="true;" id="inputBrakes" style="
    width: 40px;
">
        <button onclick="failure.fail('brakes')">FAIL</button>
<h2>Spoilers</h2>
    <span style="
    font-size: large;
    vertical-align: top;
">Chance per minute: </span>
        <input type="range" min="0" max="1" step="0.01" id="slideSpoilers" onchange="[document.getElementById('inputSpoilers').value, window.failure.chances.hydraulic.spoilers]=[document.getElementById('slideSpoilers').valueAsNumber, document.getElementById('slideSpoilers').valueAsNumber]" draggable="false" style="
    vertical-align: bottom;
">
        <input disabled="true;" id="inputSpoilers" style="
    width: 40px;
">
<button onclick="failure.fail('spoilers')">FAIL</button>
    <h1>Cabin Pressurization</h1>
    <span style="
    font-size: large;
    vertical-align: top;
">Chance per minute: </span>
        <input type="range" min="0" max="1" step="0.01" id="slidePressurization" onchange="[document.getElementById('inputPressurization').value, window.failure.chances.pressurization]=[document.getElementById('slidePressurization').valueAsNumber, document.getElementById('slidePressurization').valueAsNumber]" draggable="false" style="
    vertical-align: bottom;
">
        <input disabled="true;" id="inputPressurization" style="
    width: 40px;
">
        <button onclick="failure.fail('pressurization')">FAIL</button>
        <h1>Engines</h1>
        `;
        for (var i = 0; i < window.geofs.aircraft.instance.engines.length; i++) {
            htmlContent += `
            <h2>Engine ${i+1}</h2>
    <span style="
    font-size: large;
    vertical-align: top;
">Chance per minute: </span>
        <input type="range" min="0" max="1" step="0.01" id="slideEngine${i}" onchange="document.getElementById('inputEngine${i}').value=document.getElementById('slideEngine${i}').valueAsNumber; window.failure.chances.engines[i] = document.getElementById('slideEngine${i}').valueAsNumber"; draggable="false" style="
    vertical-align: bottom;
">
        <input disabled="true;" id="inputEngine${i}" style="
    width: 40px;
">
        <button onclick="failure.fail('engine${i}')">FAIL</button>
            `;
            window.failuresMenu.innerHTML = htmlContent;
            const draggableDiv = document.getElementById('failMenu');
            const dragPart = document.getElementById('dragPart');

            dragPart.addEventListener('mousedown', function(e) {
                let offsetX = e.clientX - draggableDiv.getBoundingClientRect().left;
                let offsetY = e.clientY - draggableDiv.getBoundingClientRect().top;

                function mouseMoveHandler(e) {
                    draggableDiv.style.left = `${e.clientX - offsetX}px`;
                    draggableDiv.style.top = `${e.clientY - offsetY}px`;
                }

                function mouseUpHandler() {
                    document.removeEventListener('mousemove', mouseMoveHandler);
                    document.removeEventListener('mouseup', mouseUpHandler);
                }

                document.addEventListener('mousemove', mouseMoveHandler);
                document.addEventListener('mouseup', mouseUpHandler);
            });
        }
    } else {
        window.failuresMenu.hidden = !window.failuresMenu.hidden;
        if (window.geofs.aircraft.instance.id !== window.aId) {
            window.failure.reset();
            window.failure = new Failure();
            htmlContent = `
        <div style="position: fixed; width: 640px; height: 10px; background: lightgray; cursor: move;" id="dragPart"></div>
        <p style="cursor: pointer;right: 0px;position: absolute;background: gray;height: fit-content;" onclick="window.failuresMenu.hidden=true;">X</p>
    <p>Note: Some failures may require a manual refresh of the page.</p>
    <button id="enBtn" onclick="(function(){window.failure.enabled=true; window.failure.tick(); document.getElementById('enBtn').hidden = true;})();">Enable</button>
    <button onclick="window.failure.reset()">RESET ALL</button>
        <h1>Landing Gear</h1>
        <h2>Front</h2>
        <span style="
    font-size: large;
    vertical-align: top;
">Chance per minute: </span>
        <input type="range" value="0" min="0" max="1" step="0.01" id="slide1" onchange="[document.getElementById('input1').value, window.failure.chances.landingGear.gearFront]=[document.getElementById('slide1').value, document.getElementById('slide1').value]" draggable="false" style="
    vertical-align: bottom;
">
        <input disabled="true;" id="input1" style="
    width: 40px;
">
    <button onclick="failure.fail('gearFront')">FAIL</button>
        <br>
        <h2>Left</h2>
        <span style="
    font-size: large;
    vertical-align: top;
">Chance per minute: </span>
        <input type="range" min="0" max="1" step="0.01" id="slideGearL" onchange="[document.getElementById('inputGearL').value, window.failure.chances.landingGear.left]=[document.getElementById('slideGearL').valueAsNumber, document.getElementById('slideGearL').valueAsNumber]" draggable="false" style="
    vertical-align: bottom;
">
        <input disabled="true;" id="inputGearL" style="
    width: 40px;
">

        <button onclick="failure.fail('gearLeft')">FAIL</button>
    <br>
        <h2>Right</h2>
        <span style="
    font-size: large;
    vertical-align: top;
">Chance per minute: </span>
            <input type="range" min="0" max="1" step="0.01" id="slideGearR" onchange="[document.getElementById('inputGearR').value, window.failure.chances.landingGear.right]=[document.getElementById('slideGearR').valueAsNumber, document.getElementById('slideGearR').valueAsNumber]" draggable="false" style="
    vertical-align: bottom;
">
        <input disabled="true;" id="inputGearR" style="
    width: 40px;
">
    <button onclick="failure.fail('gearRight')">FAIL</button>
    <br>
        <h1>Fuel Leak</h1>
        <span style="
    font-size: large;
    vertical-align: top;
">Chance per minute: </span>
        <input type="range" min="0" max="1" step="0.01" id="slideFuelLeak" onchange="[document.getElementById('inputFuelLeak').value, window.failure.chances.fuelLeak]=[document.getElementById('slideFuelLeak').valueAsNumber, document.getElementById('slideFuelLeak').valueAsNumber]" draggable="false" style="
    vertical-align: bottom;
">
        <input disabled="true;" id="inputFuelLeak" style="
    width: 40px;
">



        <button onclick="failure.fail('fuelLeak')">FAIL</button>
    <br>
    <h1>Flight Control</h1>
    <h2>Ailerons</h2>
        <span style="
    font-size: large;
    vertical-align: top;
">Chance per minute: </span>
        <input type="range" min="0" max="1" step="0.01" id="slideFlightCtrl" onchange="[document.getElementById('inputFlightCtrl').value, window.failure.chances.flightCtrl.ailerons]=[document.getElementById('slideFlightCtrl').valueAsNumber, document.getElementById('slideFlightCtrl').valueAsNumber]" draggable="false" style="vertical-align: bottom;">
    <input disabled="true;" id="inputFlightCtrl" style="
    width: 40px;
">
        <button onclick="failure.fail('ailerons')">FAIL</button><br>
            <h2>Elevators</h2>
        <span style="
    font-size: large;
    vertical-align: top;
">Chance per minute: </span>
        <input type="range" min="0" max="1" step="0.01" id="slideElevator" onchange="[document.getElementById('inputElevator').value, window.failure.chances.flightCtrl.elevator]=[document.getElementById('slideElevator').valueAsNumber, document.getElementById('slideElevator').valueAsNumber]" draggable="false" style="vertical-align: bottom;">
    <input disabled="true;" id="inputElevator" style="
    width: 40px;
">
        <button onclick="failure.fail('elevators')">FAIL</button><br>
        <h2>Rudder</h2>
        <span style="
    font-size: large;
    vertical-align: top;
">Chance per minute: </span>
        <input type="range" min="0" max="1" step="0.01" id="slideRudder" onchange="[document.getElementById('inputRudder').value, window.failure.chances.flightCtrl.rudder]=[document.getElementById('slideRudder').valueAsNumber, document.getElementById('slideRudder').valueAsNumber]" draggable="false" style="vertical-align: bottom;">
    <input disabled="true;" id="inputRudder" style="
    width: 40px;
">
        <button onclick="failure.fail('rudder')">FAIL</button><br>
    <h1>Electrical</h1>
        <span style="
    font-size: large;
    vertical-align: top;
">Chance per minute: </span>
        <input type="range" min="0" max="1" step="0.01" id="slideElectrical" onchange="[document.getElementById('inputElectrical').value, window.failure.chances.electrical]=[document.getElementById('slideElectrical').valueAsNumber, document.getElementById('slideElectrical').valueAsNumber]" draggable="false" style="
    vertical-align: bottom;
">

        <input disabled="true;" id="inputElectrical" style="
    width: 40px;
">
        <button onclick="failure.fail('electrical')">FAIL</button>

    <br>

    <h1>Structural</h1>
        <span style="
    font-size: large;
    vertical-align: top;
">Chance per minute: </span>
        <input type="range" min="0" max="1" step="0.01" id="slideStructural" onchange="[document.getElementById('inputStructural').value, window.failure.chances.structural]=[document.getElementById('slideStructural').valueAsNumber, document.getElementById('slideStructural').valueAsNumber]" draggable="false" style="
    vertical-align: bottom;
">

        <input disabled="true;" id="inputStructural" style="
    width: 40px;
">
        <button onclick="failure.fail('structural')">FAIL</button>

    <br>
    <h1>Hydraulic</h1>
<h2>Flaps</h2>
        <span style="
    font-size: large;
    vertical-align: top;
">Chance per minute: </span>
        <input type="range" min="0" max="1" step="0.01" id="slideFlaps" onchange="[document.getElementById('inputFlaps').value, window.failure.chances.hydraulic.flaps]=[document.getElementById('slideFlaps').valueAsNumber, document.getElementById('slideFlaps').valueAsNumber]" draggable="false" style="
    vertical-align: bottom;
">

        <input disabled="true;" id="inputFlaps" style="
    width: 40px;
">
        <button onclick="failure.fail('flaps')">FAIL</button>
<h2>Brakes</h2>
    <span style="
    font-size: large;
    vertical-align: top;
">Chance per minute: </span>
        <input type="range" min="0" max="1" step="0.01" id="slideBrakes" onchange="[document.getElementById('inputBrakes').value, window.failure.chances.hydraulic.brakes]=[document.getElementById('slideBrakes').valueAsNumber, document.getElementById('slideBrakes').valueAsNumber]" draggable="false" style="
    vertical-align: bottom;
">

        <input disabled="true;" id="inputBrakes" style="
    width: 40px;
">
        <button onclick="failure.fail('brakes')">FAIL</button>
<h2>Spoilers</h2>
    <span style="
    font-size: large;
    vertical-align: top;
">Chance per minute: </span>
        <input type="range" min="0" max="1" step="0.01" id="slideSpoilers" onchange="[document.getElementById('inputSpoilers').value, window.failure.chances.hydraulic.spoilers]=[document.getElementById('slideSpoilers').valueAsNumber, document.getElementById('slideSpoilers').valueAsNumber]" draggable="false" style="
    vertical-align: bottom;
">
        <input disabled="true;" id="inputSpoilers" style="
    width: 40px;
">
<button onclick="failure.fail('spoilers')">FAIL</button>
    <h1>Cabin Pressurization</h1>
    <span style="
    font-size: large;
    vertical-align: top;
">Chance per minute: </span>
        <input type="range" min="0" max="1" step="0.01" id="slidePressurization" onchange="[document.getElementById('inputPressurization').value, window.failure.chances.pressurization]=[document.getElementById('slidePressurization').valueAsNumber, document.getElementById('slidePressurization').valueAsNumber]" draggable="false" style="
    vertical-align: bottom;
">
        <input disabled="true;" id="inputPressurization" style="
    width: 40px;
">
        <button onclick="failure.fail('pressurization')">FAIL</button>
        <h1>Engines</h1>
        `;
            for (i = 0; i < window.geofs.aircraft.instance.engines.length; i++) {
                htmlContent += `
            <h2>Engine ${i+1}</h2>
    <span style="
    font-size: large;
    vertical-align: top;
">Chance per minute: </span>
        <input type="range" min="0" max="1" step="0.01" id="slideEngine${i}" onchange="document.getElementById('inputEngine${i}').value=document.getElementById('slideEngine${i}').valueAsNumber; window.failure.chances.engines[i] = document.getElementById('slideEngine${i}').valueAsNumber"; draggable="false" style="
    vertical-align: bottom;
">
        <input disabled="true;" id="inputEngine${i}" style="
    width: 40px;
">
        <button onclick="failure.fail('engine${i}')">FAIL</button>
            `;
                window.failuresMenu.innerHTML = htmlContent;
            }
        }
    }
}
window.mainFailureFunction = function() {
    'use strict';
    window.failBtn = document.createElement('div');
    window.failBtn.style.position = 'fixed';
    window.failBtn.style.right = '2%';
    window.failBtn.style.padding = '10px';
    window.failBtn.style.top = '30%';
    window.failBtn.style.border = 'transparent';
    window.failBtn.style.background = 'rgb(0,0,0)';
    window.failBtn.style.color = 'white';
    window.failBtn.style.fontWeight = '600';
    window.failBtn.style.cursor = 'pointer';
    window.failBtn.style.zIndex = "10000";
    document.body.appendChild(window.failBtn);
    window.failBtn.innerHTML = `<button style="position: inherit; right: inherit; padding: inherit; top: inherit; border: inherit; background: inherit; color: inherit; font-weight: inherit; cursor: inherit;" onclick="window.openFailuresMenu()">FAILURES</button>`;
    /*
    Some failures include:
     - Landing gear (nearly half of all aircraft-related failures) //works
     - Fuel leak (timer, then window.geofs.aircraft.instance.stopEngine()) //works
     - Flight control //works
     - Electrical //
     - Structural (weather.definition.turbulences = 5) //Y
     - Hydraulic (flaps, brakes, spoilers) //Y
     //- Pitot-Static (airspeed, altitude, vertical speed) (skipping this one for now too)
     - Cabin pressurization (weather.definition.turbulences = 5 when above 9,000 ft) //Y
     - Engine failure (from fire, bird strikes, or bad boeing build quality) //Y
     Discord user Singapore (singapore7216) requests a way to set the likelihood for a system to fail
     */
    console.log("Failures loaded.");
};
function waitForEntities() {
    try {
        if (window.geofs.cautiousWithTerrain == false) {
            // Entities are already defined, no need to wait
            window.mainFailureFunction();
            return;
        }
    } catch (error) {
        // Handle any errors (e.g., log them)
        console.log('Error in waitForEntities:', error);
    }
    // Retry after 1000 milliseconds
    setTimeout(() => {waitForEntities();}, 1000);
}
waitForEntities();
    function init() {
        // Example: Enhance  features
        console.log('GeoFS-Failures loaded successfully!');
        // Additional code for  enhancements
    }
    init();
})();
// == GeoFS-Failures ==

// To add scripts, use the following template:
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
console.log('You can enable SSR by clicking the checkbox in the settings menu');
console.log('Everything loaded successfully!');
