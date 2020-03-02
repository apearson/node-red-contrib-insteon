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
import { InsteonModemConfigNode, InsteonDeviceConfigNode } from '../../typings/types';
import PowerLincModem, { Byte, KeypadDimmer, DimmableLightingDevice, SwitchedLightingDevice, IOLinc, SensorActuatorDevice, MotionSensor, OpenCloseSensor, LeakSensor, SecurityDevice, InsteonDevice, Utilities } from 'insteon-plm';

/* Interfaces */
interface DeviceConfigNodeProps extends NodeProperties {
	modem: string;
	address: string;
	deviceType: string;
}

/* Exporting Node Function */
export = function(RED: Red) {

	// Registering node type and a constructor, callback function can't be async because of node red
	RED.nodes.registerType('insteon-device-config', function(this: InsteonDeviceConfigNode, config: DeviceConfigNodeProps) {
		// Creating actual node
		RED.nodes.createNode(this, config);

		// Converting config into address
		this.address = config.address.split(".").map(_ => parseInt(_, 16)) as Byte[];

		this.deviceType = config.deviceType;

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
		node.emit('error', 'No Modem Config');
		node.log('No modem config');
		return;
	}

	// If not connected yet, wait for connection
	if(!node.PLMConfigNode.plm.connected){
		node.PLMConfigNode.plm.once('ready', _ => setupDevice(node));
		return;
	}

	// Instanciate the device for use
	try{
		node.device = await getDeviceInstance(node, node.PLMConfigNode.plm);

		if(!node.device)
			throw new Error('No Device Instance Found');
	}
	catch(error){
		console.error(error);
		node.emit('error', `Error: ${error.message}`)
	}

	// Checking we have a device
	if(!node.device){
		// node.emit('error', 'No Device Instance');
		node.log('No device instance');
		return;
	}

	// Listeners
	node.on('close', done => onNodeClose(node, done));

	// Emitting on ready
	node.device.once('ready', _ => {
		node.log('Ready');
		node.emit('status', 'Ready')
	});
}

//#endregion

//#region Event Functions

function onNodeClose(node: InsteonDeviceConfigNode, done: ()=> void){
	done();
}

//#endregion

//#region Helpers

async function getDeviceInstance(node: InsteonDeviceConfigNode, plm: PowerLincModem){

	const options = { debug: false, syncInfo: false, syncLinks: false };

	const DeviceClass = await Utilities.getDeviceClassFromClassName(node.deviceType);

	return DeviceClass ? new DeviceClass(node.address, plm, options) : null;
}

//#endregion