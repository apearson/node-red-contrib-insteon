/*
	Interfaces & functions used by all the insteon device config nodes
*/

/* Importing Libraries and types */
import logger from 'debug';
/* Configuring logging */
const debug = logger('node-red-contrib-insteon:configMethods');

import { Red, NodeProperties } from 'node-red';
import { InsteonModemConfigNode, InsteonDeviceConfigNode } from '../../types/types';
import { Byte, Packet, InsteonDevice, Utilities } from 'insteon-plm';

/* Interfaces */
export interface DeviceConfigNodeProps extends NodeProperties {
	modem: string;
	address: string;
	cache: string;
}

//#region Connection Functions

/* Function that takes a node.id and returns the node if it is valid
 * The node must be a PLMConfig node, and the PLM must be connected
 */
export function validatePLMConnection(RED: Red, configNodeId: string){
	/* Lookup the PLM Config Node by the node ID that was passed in via the request */
	let PLMConfigNode = RED.nodes.getNode(configNodeId) as InsteonModemConfigNode;

	/* Validate that the nodeId received is referencing a PLMConfig node */
	if(PLMConfigNode == null || PLMConfigNode.type !== 'insteon-modem-config' )
		throw Error("Invalid config node specified.");

	/* Check to see if the Config Node is connected to the PLM. If the node hasn't been deployed yet, it won't be connected
	 * The best thing would be to connect, get/return the links then disconnect, but for now we will just send an error
	 */
	if(PLMConfigNode.plm === null || !PLMConfigNode.plm?.connected)
		throw Error("The PLM is not connected. Cannot load links.");

	return PLMConfigNode;
}

/* Used by every device config node to setup the device */
export async function setupDevice(RED: Red, node: InsteonDeviceConfigNode, config: DeviceConfigNodeProps){
	node.ready = false;
	
	debug(`setupDevice ${config.address} ${config.name}: start`);
	
	// Creating actual node
	RED.nodes.createNode(node, config);

	// Converting config address string into address hex array
	node.address = Utilities.toAddressArray(config.address) as Byte[];
	
	// Checking to see if we have cached data
	try{
		node.cache = JSON.parse(config.cache);
	}catch(e){
		node.cache = {};
	}

	// Checking if we don't have a modem
	if(!config.modem){
		debug(`setupDevice ${config.address} ${config.name}: no modem`);
		node.emit('status', 'No modem',config);
		return;
	}

	// Retrieve the PLMConfigNode
	node.PLMConfigNode = RED.nodes.getNode(config.modem) as InsteonModemConfigNode;

	// Can't get the device if we don't have a modem
	if(!node.PLMConfigNode || !node.PLMConfigNode.plm){
		debug(`setupDevice ${config.address} ${config.name}: no modem config`);

		node.emit('status', 'No Modem Config');
		node.log('No modem config');
		return;
	}

	// If not connected yet, wait for connection
	if(!node.PLMConfigNode.plm.connected){
		debug(`setupDevice ${config.address} ${config.name}: retry after PLM is ready`);
		node.PLMConfigNode.plm.once('ready', _ => setupDevice(RED, node, config));
		return;
	}
	
	// Instanciate the device for use
	node.device = await node.PLMConfigNode.plm.getDeviceInstance(node.address, { debug: false, syncInfo: false, syncLinks: false, cache: node.cache });

	// Checking we have a device
	if(!node.device){
		node.emit('status', 'No Device Instance');
		node.log('setupDevice: No device instance');
		debug(`setupDevice ${config.address} ${config.name}: No device instance`);
		return;
	}

	// Listeners
	node.on('close', () => onNodeClose(node));

	// Emitting on ready
	node.device.once('ready', _ => {
		node.ready = true;
		
		debug(`setupDevice ${config.address} ${config.name}: ready`);
		node.log('Ready');
		node.emit('ready', 'Listening')
	});
}

//#endregion

//#region Event Functions

export function onNodeClose(node: InsteonDeviceConfigNode){
	/* Closing Device */
	node.log('Closing device');
}

//#endregion