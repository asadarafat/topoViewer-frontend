/**
 * Updates the parent node by creating a new parent node with a new custom identifier,
 * reassigning its child nodes to the new parent using `eles.move()`, and removing the old parent node.
 *
 * @async
 * @function nodeParentPropertiesUpdate
 * @throws {Error} If required UI elements or nodes are not found or if input validation fails.
 */
async function nodeParentPropertiesUpdate() {
    try {
        // Retrieve required UI elements
        const parentIdEl = document.getElementById("panel-node-editor-parent-graph-group-id");
        const groupInputEl = document.getElementById("panel-node-editor-parent-graph-group");
        const levelInputEl = document.getElementById("panel-node-editor-parent-graph-level");

        // Validate that the required elements exist
        if (!parentIdEl || !groupInputEl || !levelInputEl) {

            console.log("#############", vsCode)

            acquireVsCodeApi().window.showWarningMessage("One or more required UI elements were not found.");

            throw new Error("One or more required UI elements were not found.");
        }

        // Get the current parent's built-in id from the UI element and trim whitespace
        const parentNodeId = parentIdEl.textContent.trim();
        if (!parentNodeId) {
            throw new Error("The parent node ID is empty.");
        }

        // Retrieve the Cytoscape node object for the old parent node
        const oldParentNode = cy.getElementById(parentNodeId);
        if (oldParentNode.empty()) {
            throw new Error(`Parent node with ID "${parentNodeId}" not found in the Cytoscape instance.`);
        }

        // Retrieve new values from the input fields and trim any extra whitespace
        const graphGroup = groupInputEl.value.trim();
        const graphLevel = levelInputEl.value.trim();

        // Validate that new values are provided
        if (!graphGroup || !graphLevel) {
            // display an error message to the user (e.g., using an alert or UI notification)
            await sendMessageToVscodeEndpointPost('clab-show-vscode-message', {
                type: 'warning',
                message: 'Graph group or graph level input is empty.'
            });

            throw new Error("Graph group or graph level input is empty.");
        }

        // Construct the new parent id (custom identifier) using the format: "graphGroup:graphLevel"
        const newParentId = `${graphGroup}:${graphLevel}`;

        // Prepare extra data object with additional metadata
        const extraData = {
            clabServerUsername: "asad",
            weight: "2",
            name: "",
            topoViewerGroup: graphGroup,
            topoViewerGroupLevel: graphLevel
        };

        // Check if a node with the new parent id already exists to prevent duplicate nodes
        if (!cy.getElementById(newParentId).empty()) {
            throw new Error(`A node with the new parent ID "${newParentId}" already exists.`);
        }

        // Create a new parent node with the new custom identifier.
        // We use the built-in "id" for proper compound relationships.
        cy.add({
            group: 'nodes',
            data: {
                id: newParentId,       // Built-in id used for compound relationships
                name: graphGroup,
                topoViewerRole: "group",
                extraData: extraData
            }
            // Optionally add styling or position properties here.
        });

        // Retrieve the newly created parent node for verification (optional)
        const newParentNode = cy.getElementById(newParentId);
        if (newParentNode.empty()) {
            throw new Error(`New parent node with ID "${newParentId}" could not be created.`);
        }

        // Retrieve all child nodes of the old parent node
        const childNodes = oldParentNode.children();

        // Loop through each child node and reassign it to the new parent
        childNodes.forEach(childNode => {
            // Update the "parent" data attribute to reflect the new parent's built-in id
            childNode.data('parent', newParentId);
            // Use Cytoscape's move() method to update the compound relationship in-place
            childNode.move({ parent: newParentId });
            // Log the updated child node data for debugging purposes
            console.log('Updated child node data:', childNode.data());
        });

        // Remove the old parent node from the Cytoscape instance
        oldParentNode.remove();

        // Update the UI element to display the new parent's identifier
        parentIdEl.textContent = newParentId;

        // Log a success message
        console.log(`Parent node updated successfully. New parent ID: ${newParentId}`);
    } catch (error) {
        // Log any errors that occur during the update process
        console.error("Error in nodeParentPropertiesUpdate:", error);
        // Optionally, display an error message to the user (e.g., using an alert or UI notification)
        // alert(`Error updating parent node: ${error.message}`);
    }
}

/**
 * Closes the parent properties panel by hiding its UI element.
 */
function nodeParentPropertiesUpdateClose() {
    const nodeEditorParentPanel = document.getElementById("panel-node-editor-parent");
    if (nodeEditorParentPanel) {
        nodeEditorParentPanel.style.display = "none";
    } else {
        console.warn("Node editor parent panel element not found.");
    }
}
