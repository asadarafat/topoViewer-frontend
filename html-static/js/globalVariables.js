// Initialize a state variable to track the element's presence
var isPanel01Cy = false;
var nodeClicked = false;
var edgeClicked = false;

var cy

var globalSelectedNode
var globalSelectedEdge

var globalLinkEndpointVisibility = true;
var globalNodeContainerStatusVisibility = false;

var globalShellUrl = "/js/cloudshell"

var globalLabName

var multiLayerViewPortState = false;

// cytoscape-leaflet variables
var globalIsGeoMapInitialized = false;
var globalCytoscapeLeafletMap;
var globalCytoscapeLeafletLeaf;

var isVscodeDeployment = Boolean(window.isVscodeDeployment);
// If window.isVscodeDeployment is undefined:
// Boolean(undefined) evaluates to false.

var vsCode

var jsonFileUrlDataCytoMarshall

// dblclick variables
var globalDblclickLastClick = { // Variables to keep track of the last click event.
    time: 0,
    id: null
};

var globalDblClickThreshold = 300; // Set the double-click threshold (in milliseconds)