// Global state variables
var isPanel01Cy = false;
var nodeClicked = false;
var edgeClicked = false;
var cy;
var globalSelectedNode;
var globalSelectedEdge;
var globalLinkEndpointVisibility = true;
var globalNodeContainerStatusVisibility = false;
var globalShellUrl = "/js/cloudshell";
var globalLabName;
var multiLayerViewPortState = false;

// Cytoscape-Leaflet variables
var globalIsGeoMapInitialized = false;
var globalCytoscapeLeafletMap;
var globalCytoscapeLeafletLeaf;

// The determined whether preset layout is enabled automtically during initialization
var globalIsPresetLayout;

// Detect if running inside VS Code webview
var isVscodeDeployment = Boolean(window.isVscodeDeployment);
var vsCode;
if (isVscodeDeployment) {
	// VS Code webview API for communication with the extension
	vsCode = acquireVsCodeApi();
}

// JSON file URL for environment data
var jsonFileUrlDataCytoMarshall;

// Double-click tracking variables
var globalDblclickLastClick = { time: 0, id: null };
var globalDblClickThreshold = 300; // Threshold in milliseconds

// Initialize environment
initEnv();

/**
 * Initializes environment variables by fetching deployment settings.
 */
async function initEnv() {
	let environments = await getEnvironments();
	globalLabName = environments["clab-name"];
	let deploymentType = environments["deployment-type"];
	globalIsPresetLayout = environments["topoviewer-layout-preset"] === "true"; // Convert to boolean

	console.info("Lab-Name:", globalLabName);
	console.info("DeploymentType:", deploymentType);
	console.info("globalIsPresetLayout:", globalIsPresetLayout);
	return environments, globalLabName;
}

/**
 * Calls a Go backend function with provided parameters.
 * 
 * @param {string} goFunctionName - Name of the Go function to call.
 * @param {any} arg01 - First parameter.
 * @param {any} arg02 - Second parameter.
 * @param {any} arg03 - Third parameter (optional).
 * @returns {Promise<any>} - Response from the backend.
 */
async function callGoFunction(goFunctionName, arg01, arg02, arg03) {
	console.log(`callGoFunction Called with ${goFunctionName}`);
	console.log(`Parameter01: ${arg01}`);
	console.log(`Parameter02: ${arg02}`);
	
	const data = { param1: arg01, param2: arg02, param3: arg03 };
	try {
		const response = await fetch(goFunctionName, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});
		if (!response.ok) throw new Error("Network response was not ok");
		return await response.json();
	} catch (error) {
		console.error("Error:", error);
		throw error;
	}
}

/**
 * Fetches environment configurations.
 * 
 * @returns {Promise<Object|null>} - Returns the environments object or null if an error occurs.
 */
async function getEnvironments() {
	try {
		let environments;
		if (isVscodeDeployment) {
			const response = await fetch(window.jsonFileUrlDataEnvironment);
			if (!response.ok) throw new Error(`Network response not ok: ${response.status}`);
			environments = await response.json();
		} else {
			environments = await sendRequestToEndpointGetV2("/get-environments");
		}
		if (environments && typeof environments === 'object' && Object.keys(environments).length > 0) {
			console.log("Fetched Environments:", environments);
			return environments;
		} else {
			console.log("Empty or invalid JSON response received");
			return null;
		}
	} catch (error) {
		console.error("Error fetching environments:", error);
		return null;
	}
}

/**
 * Posts a request to the Python backend to execute a command list.
 * 
 * @param {Event} event - The triggering event.
 * @param {Array} commandList - List of commands to execute.
 * @returns {Promise<Object|null>} - Response from the Python backend.
 */
async function postPythonAction(event, commandList) {
	try {
		showLoadingSpinnerGlobal();
		const response = await sendRequestToEndpointPost("/python-action", commandList);
		if (response && typeof response === 'object' && Object.keys(response).length > 0) {
			hideLoadingSpinnerGlobal();
			console.log("Python action response:", response);
			return response;
		} else {
			console.log("Empty or invalid JSON response received");
			return null;
		}
	} catch (error) {
		hideLoadingSpinnerGlobal();
		console.error("Error:", error);
		return null;
	}
}

/**
 * Finds a Cytoscape element by its ID.
 * 
 * @param {Array} jsonArray - Array of elements.
 * @param {string} id - ID of the target element.
 * @returns {Object|null} - The found element or null if not found.
 */
function findCytoElementById(jsonArray, id) {
	return jsonArray.find(obj => obj.data.id === id) || null;
}

/**
 * Finds a Cytoscape element by its name.
 * 
 * @param {Array} jsonArray - Array of elements.
 * @param {string} name - Name of the target element.
 * @returns {Object|null} - The found element or null if not found.
 */
function findCytoElementByName(jsonArray, name) {
	return jsonArray.find(obj => obj.data.name === name) || null;
}

/**
 * Finds a Cytoscape element by its long name.
 * 
 * @param {Array} jsonArray - Array of elements.
 * @param {string} longname - Long name of the target element.
 * @returns {Object|null} - The found element or null if not found.
 */
function findCytoElementByLongname(jsonArray, longname) {
	return jsonArray.find(obj => obj.data?.extraData?.longname === longname) || null;
}

/**
 * Sends a POST request to the specified endpoint.
 * 
 * @param {string} endpointName - The endpoint URL.
 * @param {Array} argsList - Parameters to include in the request.
 * @returns {Promise<any>} - The response data.
 */
async function sendRequestToEndpointPost(endpointName, argsList = []) {
	console.log(`callGoFunction Called with ${endpointName}`, argsList);

	const data = {};
	argsList.forEach((arg, index) => {
		data[`param${index + 1}`] = arg;
	});

	try {
		const response = await fetch(endpointName, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});

		if (!response.ok) throw new Error("Network response was not ok");

		return await response.json();
	} catch (error) {
		console.error("Error:", error);
		throw error;
	}
}

/**
 * Detects user's preferred color scheme and applies the theme.
 * 
 * @returns {string} - The detected theme ("dark", "light", or "no-preference").
 */
function detectColorScheme() {
	const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
	applyTheme(darkMode ? 'dark' : 'dark'); // Default to dark
	return darkMode ? 'dark' : 'no-preference';
}

/**
 * Applies a theme to the root element.
 * 
 * @param {string} theme - The theme name ("light" or "dark").
 */
function applyTheme(theme) {
	document.getElementById('root').setAttribute('data-theme', theme);
	console.log("Applied Theme:", theme);
}

/**
 * Displays a global loading spinner.
 */
function showLoadingSpinnerGlobal() {
	document.getElementById('loading-spinner-global').style.display = 'block';
}

/**
 * Hides the global loading spinner.
 */
function hideLoadingSpinnerGlobal() {
	document.getElementById('loading-spinner-global').style.display = 'none';
}
