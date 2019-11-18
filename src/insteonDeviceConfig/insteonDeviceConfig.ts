/*
* The purpose of this deviceConfig node is to represent a physical insteon device and allow the user to:
* - Give the device a friendly name
* - Know what the basic device type is (dimmer switch, on/off switch, motion sensor, i/o linc, etc)
* - Set the device preferences (e.g. on level, ramp rate)
* - Manage the devices link database
*
* Internally the node will also track the devices real world state and emit events when those states change
*/

import { Red, NodeProperties } from 'node-red';
import { InsteonModemConfigNode, InsteonDeviceConfigNode } from '../types/types';

interface DeviceConfigNodeProps extends NodeProperties{
	modem: string;
	address: string;
}

/* Exporting Node Function */
export = function(RED: Red){
	/* Fired on every deploy */
	/* Registering node type and a constructor */
	RED.nodes.registerType('insteon-device-config', function(this: InsteonDeviceConfigNode, config: DeviceConfigNodeProps){
		/* Creating actual node */
		RED.nodes.createNode(this, config);

		let node = this;

		/* Turn the address string the user typed into the gui into an array of hex */
		// node.address = config.address.toUpperCase().split(".").map((el: string) => parseInt("0x"+el,16) as Byte);

		if(!Array.isArray(node.address)){
			/* Stopping */
			return;
		}

		/* Checking if we don't have a modem */
		if(!config.modem){
			/* Stopping execution */
			return;
		}

		/* Retrieve the PLMConfigNode */
		node.PLMConfigNode = RED.nodes.getNode(config.modem) as InsteonModemConfigNode;

		/* Instanciate the device */
		// node.device = await node.PLMConfigNode.plm!.getDeviceInstance(node.address, {debug: false, syncInfo: true, syncLinks: false});

		// console.log("device string address:", "soon");


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