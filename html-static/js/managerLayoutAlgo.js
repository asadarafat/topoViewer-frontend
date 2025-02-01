// Check globalVariables.js for initiation


// Function to initialize Leaflet map and apply GeoMap layout
function viewportDrawerLayoutGeoMap() {

    viewportDrawerDisableGeoMap()

    if (!globalIsGeoMapInitialized) {
        // Show Leaflet container
        var leafletContainer = document.getElementById('cy-leaflet');
        if (leafletContainer) {
            leafletContainer.style.display = 'block';
        }

        // Initialize Cytoscape-Leaflet
        globalCytoscapeLeafletLeaf = cy.leaflet({
            container: leafletContainer
        });

        // Remove default tile layer
        globalCytoscapeLeafletLeaf.map.removeLayer(globalCytoscapeLeafletLeaf.defaultTileLayer);

        // Assign map reference
        globalCytoscapeLeafletMap = globalCytoscapeLeafletLeaf.map;

        // Add custom tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(globalCytoscapeLeafletMap);
        globalIsGeoMapInitialized = true;
    }

    loadCytoStyle(cy); // Reapply the Cytoscape stylesheet

    // Apply GeoMap layout
    cy.layout({
        name: 'preset',
        fit: false,
        positions: function (node) {
            let data = node.data();

            // Convert lat/lng to container point
            console.log("node.id", node.id())
            console.log("data.lat, data.lng", data.lat, data.lng)
            console.log("Number(data.lat), Number(data.lng)", Number(data.lat), Number(data.lng))

            const point = globalCytoscapeLeafletMap.latLngToContainerPoint([Number(data.lat), Number(data.lng)]);
            console.log("point: ", point.x, point.y)

            return { x: point.x, y: point.y };

        }
    }).run();

    // globalCytoscapeLeafletLeaf instance map to fit nodes
    globalCytoscapeLeafletLeaf.fit();
    console.log("globalCytoscapeLeafletLeaf.fit()")

    // Show GeoMap buttons
    var viewportDrawerGeoMapElements = document.getElementsByClassName("viewport-geo-map");
    for (var i = 0; i < viewportDrawerGeoMapElements.length; i++) {
        viewportDrawerGeoMapElements[i].classList.remove('is-hidden');
    }

    // Enable node editing
    viewportButtonsGeoMapEdit();

    console.log("GeoMap has been enabled.");
}

// Function to disable GeoMap and revert to default layout
function viewportDrawerDisableGeoMap() {

    if (!globalIsGeoMapInitialized) {
        console.log("GeoMap is not initialized.");
        return;
    }

    // Hide Leaflet container
    var leafletContainer = document.getElementById('cy-leaflet');
    if (leafletContainer) {
        leafletContainer.style.display = 'none';
    }

    // destroy globalCytoscapeLeafletLeaf instance
    globalCytoscapeLeafletLeaf.destroy();

    // Revert to default Cytoscape layout
    const layout = cy.layout({
        name: "cola",
        nodeGap: 5,
        edgeLength: 100,
        animate: true,
        randomize: false,
        maxSimulationTime: 1500,
    });
    layout.run();

    // remove node topoviewer
    topoViewerNode = cy.filter('node[name = "topoviewer"]');
    topoViewerNode.remove();

    var cyExpandCollapse = cy.expandCollapse({
        layoutBy: null, // null means use existing layout
        undoable: false,
        fisheye: false,
        animationDuration: 10, // when animate is true, the duration in milliseconds of the animation
        animate: true
    });

    // Example collapse/expand after some delay
    // Make sure the '#parent' node exists in your loaded elements
    setTimeout(function () {
        var parent = cy.$('#parent'); // Ensure that '#parent' is actually present in dataCytoMarshall.json
        cyExpandCollapse.collapse(parent);

        setTimeout(function () {
            cyExpandCollapse.expand(parent);
        }, 2000);
    }, 2000);

    // Hide GeoMap buttons
    var viewportDrawerGeoMapElements = document.getElementsByClassName("viewport-geo-map");
    for (var i = 0; i < viewportDrawerGeoMapElements.length; i++) {
        if (!viewportDrawerGeoMapElements[i].classList.contains('is-hidden')) {
            viewportDrawerGeoMapElements[i].classList.add('is-hidden');
        }
    }

    // Optionally, disable node editing if enabled
    // For example:
    // disableGeoMapNodeEditing();

    globalIsGeoMapInitialized = false;

    loadCytoStyle(cy); // Reapply the Cytoscape stylesheet

    console.log("GeoMap has been disabled and reverted to default Cytoscape layout.");
}

// Function to toggle GeoMap on and off
// Currently not used 
function toggleGeoMap() {
    var leafletContainer = document.getElementById('cy-leaflet');
    var isGeoMapEnabled = leafletContainer && leafletContainer.style.display !== 'none';

    if (isGeoMapEnabled) {
        // Disable GeoMap
        viewportDrawerDisableGeoMap();
    } else {
        // Enable GeoMap
        viewportDrawerLayoutGeoMap();
    }
}





function viewportDrawerLayoutForceDirected() {

    // Disable GeoMap, in case it is active
    viewportDrawerDisableGeoMap()

    const edgeLengthSlider = document.getElementById("force-directed-slider-link-lenght");
    const nodeGapSlider = document.getElementById("force-directed-slider-node-gap");

    const edgeLengthValue = parseFloat(edgeLengthSlider.value);
    const nodeGapValue = parseFloat(nodeGapSlider.value);

    console.info("edgeLengthValue", edgeLengthValue);
    console.info("nodeGapValue", nodeGapValue);

    // Calculate the layout for the optic layer (Layer-1)
    cy.layout({
        name: "cola",
        nodeSpacing: function (node) {
            return nodeGapValue;
        },
        edgeLength: function (edge) {
            return edgeLengthValue * 100 / edge.data("weight");
        },
        animate: true,
        randomize: false,
        maxSimulationTime: 1500
    }).run();

    // Get the bounding box of Layer-1 optic nodes
    const opticLayerNodes = cy.nodes('[parent="layer1"]');
    const opticBBox = opticLayerNodes.boundingBox();

    // Set layer offsets
    const layerOffsets = {
        layer2: opticBBox.y2 + 100, // L2 nodes below Optic layer
        layer3: opticBBox.y2 + 300, // IP/MPLS nodes below L2 layer
        layer4: opticBBox.y2 + 500 // VPN nodes below IP/MPLS layer
    };

    // Position the nodes for each layer while preserving x-coordinates
    ["layer2", "layer3", "layer4"].forEach((layer, index) => {
        const layerNodes = cy.nodes(`[parent="${layer}"]`);
        const offsetY = layerOffsets[layer];

        layerNodes.positions((node, i) => {
            return {
                x: opticLayerNodes[i % opticLayerNodes.length].position("x"), // Align x with Layer-1
                y: opticLayerNodes[i % opticLayerNodes.length].position("y") + offsetY
            };
        });
    });

    // Optionally, apply animations for expanding and collapsing nodes
    const cyExpandCollapse = cy.expandCollapse({
        layoutBy: null, // Use existing layout
        undoable: false,
        fisheye: false,
        animationDuration: 10, // Duration of animation
        animate: true
    });
    // Example collapse/expand after some delay
    // Make sure the '#parent' node exists in your loaded elements
    setTimeout(function () {
        var parent = cy.$('#parent'); // Ensure that '#parent' is actually present in dataCytoMarshall.json
        cyExpandCollapse.collapse(parent);

        setTimeout(function () {
            cyExpandCollapse.expand(parent);
        }, 2000);
    }, 2000);
}






function viewportDrawerLayoutForceDirectedRadial() {

    // Disable GeoMap, in case it is active
    viewportDrawerDisableGeoMap()

    edgeLengthSlider = document.getElementById("force-directed-radial-slider-link-lenght");
    const edgeLengthValue = parseFloat(edgeLengthSlider.value);
    console.info("edgeLengthValue", edgeLengthValue);

    nodeGapSlider = document.getElementById("force-directed-radial-slider-node-gap");
    const nodeGapValue = parseFloat(nodeGapSlider.value);
    console.info("edgeLengthValue", nodeGapValue);

    // Map TopoViewerGroupLevel to weights (lower levels = higher weight)	
    const nodeWeights = {};
    cy.nodes().forEach((node) => {
        const level = node.data('extraData')?.labels?.TopoViewerGroupLevel ?
            parseInt(node.data('extraData').labels.TopoViewerGroupLevel) :
            1; // Default level to 1 if missing
        nodeWeights[node.id()] = 1 / level; // Higher weight for lower levels
    });

    // Adjust edge styles to avoid overlaps
    cy.edges().forEach((edge) => {
        edge.style({
            'curve-style': 'bezier', // Use curved edges
            'control-point-step-size': 20, // Distance for control points
        });
    });

    // Apply Cola layout with weights and better edge handling
    cy.layout({
        name: 'cola',
        fit: true, // Automatically fit the layout to the viewport
        nodeSpacing: nodeGapValue, // Gap between nodes
        edgeLength: (edge) => {
            const sourceWeight = nodeWeights[edge.source().id()] || 1;
            const targetWeight = nodeWeights[edge.target().id()] || 1;
            return (1 * edgeLengthValue) / (sourceWeight + targetWeight); // Shorter edges for higher-weight nodes
        },
        edgeSymDiffLength: 10, // Symmetrical edge separation to reduce overlaps
        nodeDimensionsIncludeLabels: true, // Adjust layout considering node labels
        animate: true,
        maxSimulationTime: 2000,
        avoidOverlap: true, // Prevents node overlaps
    }).run();

    var cyExpandCollapse = cy.expandCollapse({
        layoutBy: null,
        undoable: false,
        fisheye: true,
        animationDuration: 10, // when animate is true, the duration in milliseconds of the animation
        animate: true
    });

    // Example collapse/expand after some time:
    setTimeout(function () {
        var parent = cy.$('#parent');
        cyExpandCollapse.collapse(parent);

        setTimeout(function () {
            cyExpandCollapse.expand(parent);
        }, 2000);
    }, 2000);
}

function viewportDrawerLayoutVertical() {

    // Disable GeoMap, in case it is active
    viewportDrawerDisableGeoMap()

    // Retrieve the sliders for node and group vertical gaps
    const nodevGap = document.getElementById("vertical-layout-slider-node-v-gap");
    const groupvGap = document.getElementById("vertical-layout-slider-group-v-gap");

    // Parse the slider values for horizontal and vertical gaps
    const nodevGapValue = parseFloat(nodevGap.value); // Gap between child nodes within a parent
    const groupvGapValue = parseFloat(groupvGap.value); // Gap between parent nodes

    const delay = 100; // Delay to ensure layout updates after rendering

    setTimeout(() => {
        // Step 1: Position child nodes within their respective parents
        cy.nodes().forEach(function (node) {
            if (node.isParent()) {
                const children = node.children(); // Get the children of the current parent node
                const cellWidth = node.width() / children.length; // Calculate the width for each child node

                // Position child nodes evenly spaced within the parent node
                children.forEach(function (child, index) {
                    const xPos = index * (cellWidth + nodevGapValue); // Horizontal position for the child
                    const yPos = 0; // Keep child nodes on the same vertical level

                    child.position({
                        x: xPos,
                        y: yPos
                    });
                });
            }
        });

        // Step 2: Sort parent nodes by their group level and ID for vertical stacking
        const sortedParents = cy.nodes()
            .filter(node => node.isParent()) // Only process parent nodes
            .sort((a, b) => {
                // Extract group levels for primary sorting
                const groupLevelA = parseInt(a.data('extraData')?.topoViewerGroupLevel || 0, 10);
                const groupLevelB = parseInt(b.data('extraData')?.topoViewerGroupLevel || 0, 10);

                if (groupLevelA !== groupLevelB) {
                    return groupLevelA - groupLevelB; // Sort by group level in ascending order
                }
                // Secondary sorting by node ID (alphabetical order)
                return a.data('id').localeCompare(b.data('id'));
            });

        let yPos = 0; // Starting vertical position for parent nodes
        let maxWidth = 0; // Initialize variable to store the maximum parent width
        const centerX = 0; // Define the horizontal center reference

        // Step 3: Find the widest parent node
        cy.nodes().forEach(function (node) {
            if (node.isParent()) {
                const width = node.width();
                if (width > maxWidth) {
                    maxWidth = width; // Update maxWidth with the widest parent node's width
                    console.info("ParentMaxWidth: ", maxWidth);
                }
            }
        });

        // Calculate division factor for aligning parent nodes
        const divisionFactor = maxWidth / 2;
        console.info("Division Factor: ", divisionFactor);

        // Step 4: Position parent nodes vertically and align them relative to the widest parent node
        sortedParents.forEach(function (parentNode) {
            const parentWidth = parentNode.width();

            // Calculate horizontal position relative to the widest parent
            const xPos = centerX - parentWidth / divisionFactor;

            // Position the parent node
            parentNode.position({
                x: xPos,
                y: yPos
            });

            console.info(`Parent Node '${parentNode.id()}' positioned at x: ${xPos}, y: ${yPos}`);

            // Increment vertical position for the next parent
            yPos += groupvGapValue;
        });

        // Step 5: Adjust the viewport to fit the updated layout
        cy.fit();

    }, delay);

    // Step 6: Expand/collapse functionality for parent nodes (optional)
    const cyExpandCollapse = cy.expandCollapse({
        layoutBy: null, // Use the existing layout
        undoable: false, // Disable undo functionality
        fisheye: false, // Disable fisheye view for expanded/collapsed nodes
        animationDuration: 10, // Duration of animations in milliseconds
        animate: true // Enable animation for expand/collapse
    });

    // Example: Demonstrate expand/collapse behavior with a specific parent node
    setTimeout(function () {
        const parent = cy.$('#parent'); // Replace '#parent' with the actual parent node ID if needed
        cyExpandCollapse.collapse(parent); // Collapse the parent node

        setTimeout(function () {
            cyExpandCollapse.expand(parent); // Re-expand the parent node after a delay
        }, 2000); // Wait 2 seconds before expanding
    }, 2000);
}

function viewportDrawerLayoutHorizontal() {

    // Disable GeoMap, in case it is active
    viewportDrawerDisableGeoMap()


    // Retrieve the sliders for node and group horizontal gaps
    const nodehGap = document.getElementById("horizontal-layout-slider-node-h-gap");
    const grouphGap = document.getElementById("horizontal-layout-slider-group-h-gap");

    // Parse the slider values for horizontal and vertical gaps
    const nodehGapValue = parseFloat(nodehGap.value) * 10; // Gap between child nodes within a parent
    const grouphGapValue = parseFloat(grouphGap.value); // Gap between parent nodes

    const delay = 100; // Delay to ensure layout updates after rendering

    setTimeout(() => {
        // Step 1: Position child nodes within their respective parents
        cy.nodes().forEach(function (node) {
            if (node.isParent()) {
                const children = node.children(); // Get the children of the current parent node
                const cellHeight = node.height() / children.length; // Calculate the height for each child node

                // Position child nodes evenly spaced within the parent node
                children.forEach(function (child, index) {
                    const xPos = 0; // Keep child nodes on the same horizontal level
                    const yPos = index * (cellHeight + nodehGapValue); // Vertical position for the child

                    child.position({
                        x: xPos,
                        y: yPos
                    });
                });
            }
        });

        // Step 2: Sort parent nodes by their group level and ID for horizontal stacking
        const sortedParents = cy.nodes()
            .filter(node => node.isParent()) // Only process parent nodes
            .sort((a, b) => {
                // Extract group levels for primary sorting
                const groupLevelA = parseInt(a.data('extraData')?.topoViewerGroupLevel || 0, 10);
                const groupLevelB = parseInt(b.data('extraData')?.topoViewerGroupLevel || 0, 10);

                if (groupLevelA !== groupLevelB) {
                    return groupLevelA - groupLevelB; // Sort by group level in ascending order
                }
                // Secondary sorting by node ID (alphabetical order)
                return a.data('id').localeCompare(b.data('id'));
            });

        let xPos = 0; // Starting horizontal position for parent nodes
        let maxHeight = 0; // Initialize variable to store the maximum parent height
        const centerY = 0; // Define the vertical center reference

        // Step 3: Find the tallest parent node
        cy.nodes().forEach(function (node) {
            if (node.isParent()) {
                const height = node.height();
                if (height > maxHeight) {
                    maxHeight = height; // Update maxHeight with the tallest parent node's height
                    console.info("ParentMaxHeight: ", maxHeight);
                }
            }
        });

        // Calculate division factor for aligning parent nodes
        const divisionFactor = maxHeight / 2;
        console.info("Division Factor: ", divisionFactor);

        // Step 4: Position parent nodes horizontally and align them relative to the tallest parent node
        sortedParents.forEach(function (parentNode) {
            const parentHeight = parentNode.height();

            // Calculate vertical position relative to the tallest parent
            const yPos = centerY - parentHeight / divisionFactor;

            // Position the parent node
            parentNode.position({
                x: xPos,
                y: yPos
            });

            console.info(`Parent Node '${parentNode.id()}' positioned at x: ${xPos}, y: ${yPos}`);

            // Increment horizontal position for the next parent
            xPos += grouphGapValue;
        });

        // Step 5: Adjust the viewport to fit the updated layout
        cy.fit();

    }, delay);

    // Step 6: Expand/collapse functionality for parent nodes (optional)
    const cyExpandCollapse = cy.expandCollapse({
        layoutBy: null, // Use the existing layout
        undoable: false, // Disable undo functionality
        fisheye: false, // Disable fisheye view for expanded/collapsed nodes
        animationDuration: 10, // Duration of animations in milliseconds
        animate: true // Enable animation for expand/collapse
    });

    // Example: Demonstrate expand/collapse behavior with a specific parent node
    setTimeout(function () {
        const parent = cy.$('#parent'); // Replace '#parent' with the actual parent node ID if needed
        cyExpandCollapse.collapse(parent); // Collapse the parent node

        setTimeout(function () {
            cyExpandCollapse.expand(parent); // Re-expand the parent node after a delay
        }, 2000); // Wait 2 seconds before expanding
    }, 2000);
}