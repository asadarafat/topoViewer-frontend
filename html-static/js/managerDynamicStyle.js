// Global toggle for enabling/disabling dynamic style updates.
// When true, the socket event handler will be bound; when false, it will be unbound.
var globalToggleOnChangeCytoStyle = false;


// aarafat-tag: vscode socket.io
const socket = io('http://localhost:3000');

// Global storage for dynamic Cytoscape style updates.
window.dynamicCytoStyles = new Map();

// Global cache for previous state mappings per use-case.
// Each key (e.g. "interfaceState") maps to an object where keys are "nodeName-endpoint" and values are the monitored value.
window.previousStateByUseCase = {};

// (Optional) Global cache for last known state per endpoint.
window.cachedEndpointStates = {};




// -----------------------------------------------------------------------------
// STYLE HELPER FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Updates the dynamic style for an edge and caches the update.
 *
 * @param {string} edgeId - The unique ID of the edge.
 * @param {string} styleProp - The style property to update (e.g. "text-background-color").
 * @param {string|number} value - The new value for the style property.
 */
function updateEdgeDynamicStyle(edgeId, styleProp, value) {
    const edge = cy.$(`#${edgeId}`);
    if (edge.length > 0) {
        edge.style(styleProp, value);
        const cacheKey = `edge:${edgeId}:${styleProp}`;
        window.dynamicCytoStyles.set(cacheKey, value);
    }
}

/**
 * Updates the dynamic style for a node and caches the update.
 *
 * @param {string} nodeId - The unique ID of the node.
 * @param {string} styleProp - The style property to update (e.g. "background-color").
 * @param {string|number} value - The new value for the style property.
 */
function updateNodeDynamicStyle(nodeId, styleProp, value) {
    const node = cy.$(`#${nodeId}`);
    if (node.length > 0) {
        node.style(styleProp, value);
        const cacheKey = `node:${nodeId}:${styleProp}`;
        window.dynamicCytoStyles.set(cacheKey, value);
    }
}

/**
 * Iterates over the dynamic style cache and re-applies the stored styles.
 */
function restoreDynamicStyles() {
    window.dynamicCytoStyles.forEach((value, key) => {
        const parts = key.split(":"); // e.g. ["edge", "Clab-Link0", "text-background-color"]
        if (parts.length !== 3) return;
        const [type, id, styleProp] = parts;
        if (type === "edge") {
            const edge = cy.$(`#${id}`);
            if (edge.length > 0) {
                edge.style(styleProp, value);
            }
        } else if (type === "node") {
            const node = cy.$(`#${id}`);
            if (node.length > 0) {
                node.style(styleProp, value);
            }
        }
    });
}


// -----------------------------------------------------------------------------
// USE-CASE SPECIFIC MAPPING FUNCTIONS (RULES)
// -----------------------------------------------------------------------------

/**
 * onChangeRuleInterfaceOperState(labData)
 *
 * Monitors interface operational state.
 * Iterates through labData and returns a mapping from "nodeName-endpoint" to "Up" or "Down".
 *
 * @param {object} labData - Raw lab data.
 * @returns {object} Mapping of keys (e.g. "router1-e1-1") to state ("Up" or "Down").
 */
function onChangeRuleInterfaceOperState(labData) {
    const stateMap = {};
    for (const labPath in labData) {
        try {
            const lab = labData[labPath];

            console.log("labName: ", lab.name);


            if (!lab || !Array.isArray(lab.containers)) continue;
            lab.containers.forEach(container => {
                if (typeof container.label !== "string") return;
                // Remove lab-specific prefix; adjust the regex as needed.
                //   const nodeName = container.label.replace(/^clab-.*?-/, '');
                const nodeClabName = container.label

                const getRouterName = (fullString, keyword) =>
                    fullString.split(keyword)[1].replace(/^-/, '');

                nodeName = getRouterName(nodeClabName, lab.name); // Outputs: router1


                console.log("nodeName: ", nodeName);

                if (!Array.isArray(container.interfaces)) return;
                container.interfaces.forEach(iface => {
                    if (!iface || typeof iface.label !== "string") return;
                    const description = iface.description || "";
                    const state = description.toUpperCase().includes("UP") ? "Up" : "Down";
                    const endpoint = iface.label;
                    const key = `${nodeName}::${endpoint}`;
                    stateMap[key] = state;
                });
            });
        } catch (err) {
            console.error(`Error processing labPath "${labPath}" in interface state detection:`, err);
        }
    }
    console.log("onChangeRuleInterfaceOperState mapping:", stateMap);
    return stateMap;
}


// -----------------------------------------------------------------------------
// UPDATE HANDLERS (USE-CASE SPECIFIC)
// -----------------------------------------------------------------------------

/**
 * onChangeHandlerInterfaceOperState(updateMessage)
 *
 * Handler for interface operational state changes.
 * Expects an updateMessage with:
 *   - nodeName: string
 *   - endpoint: string
 *   - state: "Up" or "Down"
 *   - [removed]: boolean (optional)
 *
 * It updates the dynamic style of matching edges accordingly.
 *
 * @param {object} updateMessage - The update message.
 */
function onChangeHandlerInterfaceOperState(updateMessage) {
    console.log("onChangeHandlerInterfaceOperState received:", updateMessage);
    const { nodeName, monitoredObject, state, removed } = updateMessage;
    const safeNodeName = typeof CSS !== "undefined" ? CSS.escape(nodeName) : nodeName;
    const safeEndpoint = typeof CSS !== "undefined" ? CSS.escape(monitoredObject) : monitoredObject;
    // const edgeSelector = `edge[source="${safeNodeName}"][sourceEndpoint="${safeEndpoint}"]`;


    const edgeSelector = `edge[source="${safeNodeName}"][sourceEndpoint="${safeEndpoint}"]`;

    console.log("safeNodeName: ", safeNodeName);
    console.log("safeEndpoint: ", safeEndpoint);
    console.log("edgeSelector: ", edgeSelector);

    const edges = cy.$(edgeSelector);



    edgeCollection = edges
    // Check if any matching edge was found and retrieve its id
    if (edgeCollection.length > 0) {
        // If there's more than one matching edge, you'll need to decide how to handle them.
        const edgeId = edgeCollection[0].id(); // or edgeCollection[0].data('id')
        console.log("edgeId:", edgeId);
    } else {
        console.log(`No edge found with source ${safeNodeName} and sourceEndpoint ${safeEndpoint}`);
    }

    if (edges.length > 0) {
        if (removed) {
            edges.forEach(edge => {
                // updateEdgeDynamicStyle(edge.id(), "text-background-color", "#CACBCC");
                // updateEdgeDynamicStyle(edge.id(), "text-background-opacity", "0.7");

                updateEdgeDynamicStyle(edge.id(), "line-color", "#969799");

            });
            console.log(`Reverted styles for removed edge(s) matching: ${edgeSelector}`);
        } else {
            const newColor = state === "Up" ? '#00df2b' : '#df2b00';
            edges.forEach(edge => {
                // updateEdgeDynamicStyle(edge.id(), "text-background-color", newColor);
                // updateEdgeDynamicStyle(edge.id(), "text-background-opacity", "0.9");

                updateEdgeDynamicStyle(edge.id(), "line-color", newColor);
            });
            console.log(`Updated edge(s) matching ${edgeSelector} with color: ${newColor}`);
        }
    } else {
        console.warn(`No edge found matching: ${edgeSelector}`);
    }
}

// -----------------------------------------------------------------------------
// GLOBAL MONITOR CONFIGURATIONS (DRY)
// -----------------------------------------------------------------------------

/**
 * Global monitor configurations.
 * This array defines use-case specific mapping functions (rules) and their corresponding handlers.
 * To add new use cases, simply add another object with:
 *   - useCase: Unique identifier (e.g. "interfaceState").
 *   - mapping: Function that takes labData and returns a mapping (key → value).
 *   - handler: Function that handles update messages when a change is detected.
 *
 * @type {Array<{useCase: string, mapping: function, handler: function}>}
 */
const monitorConfigs = [
    {
        useCase: "interfaceState",
        mapping: onChangeRuleInterfaceOperState,
        handler: onChangeHandlerInterfaceOperState
    }
    // ,
    // {
    //     useCase: "interfaceSpeed",
    //     mapping: onChangeRuleInterfaceSpeed,
    //     handler: onChangeHandlerInterfaceSpeed
    // }
    // Additional use-case configurations can be added here.
];

// -----------------------------------------------------------------------------
// SOCKET.IO EVENT LISTENER (ENTRY POINT)
// -----------------------------------------------------------------------------

/**
 * Listens for raw lab data from the backend on the "clab-tree-provider-data" event.
 * When received, the stateMonitorEngine is invoked with the global monitorConfigs.
 */
socket.on("clab-tree-provider-data", (labData) => {
    console.log("Received clab-tree-provider-data:", labData);
    stateMonitorEngine(labData, monitorConfigs);
});

// -----------------------------------------------------------------------------
// GENERIC STATE MONITOR ENGINE
// -----------------------------------------------------------------------------

/**
 * stateMonitorEngine(labData, monitorConfigs)
 *
 * Processes raw lab data for each use-case defined in monitorConfigs.
 * It compares the current state mapping (from the mapping function) with the cached state.
 * If differences are found, the corresponding handler is called with an update message.
 *
 * @param {object} labData - Raw lab data from the backend.
 * @param {Array} monitorConfigs - Array of configuration objects, each with:
 *    - useCase {string}: Unique identifier (e.g. "interfaceState").
 *    - mapping {function(labData: object): object}: Returns a mapping from "nodeName-endpoint" to monitored value.
 *    - handler {function(updateMessage: object): void}: Called when a change is detected.
 */
function stateMonitorEngine(labData, monitorConfigs) {
    monitorConfigs.forEach(config => {
        const { useCase, mapping, handler } = config;
        let currentState = {};
        // Step 1: Generate current mapping.
        try {
            currentState = mapping(labData);
        } catch (err) {
            console.error(`Error in mapping for useCase "${useCase}":`, err);
            return; // Skip this use-case if mapping fails.
        }
        // Retrieve previous state for this use-case.
        const prevState = window.previousStateByUseCase[useCase] || {};

        // Step 2: Compare current state with previous state.
        for (const key in currentState) {
            if (prevState[key] !== currentState[key]) {
                const [nodeName, monitoredObject] = key.split("::");
                const updateMessage = { nodeName, monitoredObject, state: currentState[key] };
                console.log(`Detected change for use case "${useCase}":`, updateMessage);
                // Step 3: Call the use-case specific handler.
                handler(updateMessage);
            }
        }
        // Also check for keys that were present before but are now missing.
        for (const key in prevState) {
            if (!(key in currentState)) {
                const [nodeName, monitoredObject] = key.split("::");
                const updateMessage = { nodeName, monitoredObject, removed: true };
                console.log(`Detected removal for use case "${useCase}":`, updateMessage);
                handler(updateMessage);
            }
        }
        // Step 4: Update the cached state.
        window.previousStateByUseCase[useCase] = currentState;
    });
}



// -----------------------------------------------------------------------------
// SOCKET BINDING CONTROL
// -----------------------------------------------------------------------------

/**
 * updateSocketBinding()
 *
 * Unbinds any previous listener for "clab-tree-provider-data" and, if the global toggle is enabled,
 * binds an inline listener that processes the lab data using the generic state monitor engine.
 */
function updateSocketBinding() {
    // Unbind previous "clab-tree-provider-data" listeners.
    socket.off('clab-tree-provider-data');

    if (globalToggleOnChangeCytoStyle) {
        socket.on('clab-tree-provider-data', (labData) => {
            console.log("Received clab-tree-provider-data:", labData);
            // Use the global monitorConfigs defined below.
            stateMonitorEngine(labData, monitorConfigs);
        });
        console.log("Socket 'clab-tree-provider-data' event bound.");
    } else {
        console.log("Socket 'clab-tree-provider-data' event unbound.");
    }
}
