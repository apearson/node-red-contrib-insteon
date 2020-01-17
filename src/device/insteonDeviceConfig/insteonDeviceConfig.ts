/*
* The purpose of this deviceConfig node is to represent a physical insteon device and allow the user to:
* - Give the device a friendly name
* - Know what the basic device type is (dimmer switch, on/off switch, motion sensor, i/o linc, etc)
* - Set the device preferences (e.g. on level, ramp rate)
* - Manage the devices link database
*
* Internally the node will also track the devices real world state and emit events when those states change
*/

/* Importing Libraries and types */
import { Red } from 'node-red';
import { InsteonDeviceConfigNode } from '../../types/types';
import { setupDevice, DeviceConfigNodeProps } from './configMethods';


/* Exporting Node Function */
export = function(RED: Red) {
	// Registering node type and a constructor, callback function can't be async because of node red. Fired on every deploy of the node.
	RED.nodes.registerType('insteon-device-config', function(this: InsteonDeviceConfigNode, config: DeviceConfigNodeProps) {
		// Setting up the device
		setupDevice(RED, this, config);
	});
};