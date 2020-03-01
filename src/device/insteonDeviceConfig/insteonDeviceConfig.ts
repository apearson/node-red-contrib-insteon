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
import PowerLincModem, { Byte, KeypadDimmer, DimmableLightingDevice, SwitchedLightingDevice, IOLinc, SensorActuatorDevice, MotionSensor, OpenCloseSensor, LeakSensor, SecurityDevice, InsteonDevice } from 'insteon-plm';

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

		node.log(`[${node.address}]: ${node.device.constructor.name}`);

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

	node.log(node.deviceType);

	if(!node.deviceType){
		node.log('Querying device');
		return await plm.getDeviceInstance(node.address, { debug: false, syncInfo: false, syncLinks: false });
	}

	const type = node.deviceType.split(':');
	const cat = Number(type[0]);
	const subcat = Number(type[1]);
	const options = { debug: false, syncInfo: false, syncLinks: false };

	switch(cat){
		case 0x01:
			switch(subcat){
				case 0x1C: return new KeypadDimmer(node.address, plm, options);
				default: return new DimmableLightingDevice(node.address, plm, options);
			}

		case 0x02: return new SwitchedLightingDevice(node.address, plm, options);

		case 0x07:
			switch(subcat){
				case 0x00: return new IOLinc(node.address, plm, options);
				default: return new SensorActuatorDevice(node.address, plm, options);
			}

		case 0x10:
			switch(subcat){
				case 0x01:
				case 0x03:
				case 0x04:
				case 0x05: return new MotionSensor(node.address, plm, options);

				case 0x02:
				case 0x06:
				case 0x07:
				case 0x09:
				case 0x11:
				case 0x14:
				case 0x015: return new OpenCloseSensor(node.address, plm, options);

				case 0x08: return new LeakSensor(node.address, plm, options);

				default: return new SecurityDevice(node.address, plm, options);
			}

		default: return new InsteonDevice(node.address, plm, options);
	}

}

//#endregion