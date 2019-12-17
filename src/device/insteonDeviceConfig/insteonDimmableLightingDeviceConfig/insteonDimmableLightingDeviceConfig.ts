/* Importing Libraries and types */
import { Red } from 'node-red';
import { InsteonDeviceConfigNode } from '../../../types/types';
import { setupDevice, DeviceConfigNodeProps } from '../configMethods';


/* Exporting Node Function */
export = function(RED: Red) {

	// Registering node type and a constructor, callback function can't be async because of node red. Fired on every deploy of the node.
	RED.nodes.registerType('insteon-dimmable-lighting-device-config', function(this: InsteonDeviceConfigNode, config: DeviceConfigNodeProps) {		
		// Setting up the device
		setupDevice(RED, this, config);
	});
};