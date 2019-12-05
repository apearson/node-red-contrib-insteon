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
import { Red, NodeProperties } from 'node-red';
import { InsteonModemConfigNode, InsteonDeviceConfigNode } from '../../types/types';
import { Byte, Packet, InsteonDevice, Utilities } from 'insteon-plm';

/* Interfaces */
interface DeviceConfigNodeProps extends NodeProperties {
	modem: string;
	address: string;
	cache: string;
}

/* Exporting Node Function */
export = function(RED: Red) {

	// Registering node type and a constructor, callback function can't be async because of node red. Fired on every deploy of the node.
	RED.nodes.registerType('insteon-device-config', function(this: InsteonDeviceConfigNode, config: DeviceConfigNodeProps) {
		// Creating actual node
		RED.nodes.createNode(this, config);

		// Converting config into address
		this.address = Utilities.toAddressArray(config.address) as Byte[];
		
		// Checking to see if we have cached data
		try{
			this.cache = JSON.parse(config.cache);
		}catch(e){
			this.cache = {};
		}

		// Checking if we don't have a modem
		if(!config.modem){
			this.emit('status', 'No modem');
			return;
		}

		// Retrieve the PLMConfigNode
		this.PLMConfigNode = RED.nodes.getNode(config.modem) as InsteonModemConfigNode;

		// Setting up rest of device
		setupDevice(this);
	});
};

//#region Connection Functions

async function setupDevice(node: InsteonDeviceConfigNode){

	// Can't get the device if we don't have a modem
	if(!node.PLMConfigNode || !node.PLMConfigNode.plm){
		node.emit('status', 'No Modem Config');
		node.log('No modem config');
		return;
	}

	// If not connected yet, wait for connection
	if(!node.PLMConfigNode.plm.connected){
		node.PLMConfigNode.plm.once('ready', _ => setupDevice(node));
		return;
	}
	
	// Instanciate the device for use
	node.device = await node.PLMConfigNode.plm.getDeviceInstance(node.address, { debug: false, syncInfo: true, syncLinks: false, cache: node.cache });

	// Checking we have a device
	if(!node.device){
		node.emit('status', 'No Device Instance');
		node.log('No device instance');
		return;
	}

	// Listeners
	node.on('close', () => onNodeClose(node));

	// Emitting on ready
	node.device.once('ready', _ => {
		node.log('Ready');
		node.emit('ready', 'Listening')
	});
}

//#endregion

//#region Event Functions

function onNodeClose(node: InsteonDeviceConfigNode){
	/* Closing Device */
	node.log('Closing device');
}

//#endregion