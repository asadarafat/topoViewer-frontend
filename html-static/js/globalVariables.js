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
