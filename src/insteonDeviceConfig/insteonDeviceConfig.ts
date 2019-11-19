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
import { InsteonModemConfigNode, InsteonDeviceConfigNode } from '../types/types';
import { Byte, Packet, InsteonDevice } from 'insteon-plm';

/* Interfaces */
interface DeviceConfigNodeProps extends NodeProperties {
	modem: string;
	address1: string;
	address2: string;
	address3: string;
}

/* Exporting Node Function */
export = function(RED: Red) {

	// Registering node type and a constructor, callback function can't be async because of node red
	RED.nodes.registerType('insteon-device-config', function(this: InsteonDeviceConfigNode, config: DeviceConfigNodeProps) {
		// Creating actual node
		RED.nodes.createNode(this, config);

		// Converting config into address
		this.address = [parseInt(config.address1, 16), parseInt(config.address2, 16), parseInt(config.address3, 16)] as Byte[];

		// Updating status incase of failure
		// this.status({ text: 'No modem', fill: 'red', shape: 'dot' });

		// Checking if we don't have a modem
		if(!config.modem){
			this.emit('Ready');
			return;
		}

		// Retrieve the PLMConfigNode
		this.PLMConfigNode = RED.nodes.getNode(config.modem) as InsteonModemConfigNode;

		// Setting up rest of device
		setupDevice(this);

		// /* Send a product data request message to the device to find out what it is */
		// getDeviceInfo(node.PLMConfigNode.plm).then(res,err){
		// 	console.log("res:",res);
		// };

		// let deviceInfo = await node.PLMConfigNode.plm.sendStandardCommand(node.address,0x00,0x03,0x00);
		// console.log(deviceInfo);
		// deviceTypes.filter()

		/* subscribe to packets addressed from the device */
		// node.PLMConfigNode.plm.on(["**",node.stringAddress], function(packet){
		// 	node.warn(`got packet from ${node.stringAddress}`);
		// 	node.warn(packet);
		// });
	});
};

//#region Connection Functions

async function setupDevice(node: InsteonDeviceConfigNode){

	// Updating status incase of failure
	// node.status({ text: 'No modem config', fill: 'red', shape: 'dot' });

	// Can't get the device if we don't have a modem
	if(!node.PLMConfigNode || !node.PLMConfigNode.plm){
		node.emit('ready', 'No Modem Config');
		node.log('No modem config');
		return;
	}

	// If not connected yet, wait for connection
	if(!node.PLMConfigNode.plm.connected){
		node.PLMConfigNode.plm.once('connected', _ => setupDevice(node));
		return;
	}


	// Instanciate the device for use
	node.device = new InsteonDevice(node.address, node.PLMConfigNode.plm, { debug: false, syncInfo: true, syncLinks: false })
	// node.device = await node.PLMConfigNode.plm.getDeviceInstance(node.address, { debug: false, syncInfo: true, syncLinks: false });

	node.log('Got device');

	// Updating status incase of failure
	// node.status({ text: 'No device instance', fill: 'red', shape: 'dot' });

	// Checking we have a device
	if(!node.device){
		node.emit('ready', 'No Device Instance');
		node.log('No device instance');
		return;
	}

	// Emitting all messages
	node.device.on('**', d => node.emit(d));

	node.device.on(['packet', '**'], p => onPacket(node, p));

	// Emitting on ready
	node.device.on('ready', _ => {
		node.log('Ready');
		node.emit('ready', 'Listening')
	});

	// Updating status
	// node.status({ text: 'Working', fill: 'green', shape: 'dot' });
}

//#endregion

//#region Event Functions

function onPacket(node: InsteonDeviceConfigNode, packet: Packet.Packet){
	node.log('Packet');
	node.emit('packet', packet);
}

//#endregion