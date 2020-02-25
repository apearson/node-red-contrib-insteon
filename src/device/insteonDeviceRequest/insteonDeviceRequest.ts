import { Red, NodeProperties, Node } from 'node-red';
import { Byte, SwitchedLightingDevice } from 'insteon-plm';
import { InsteonDeviceConfigNode } from '../../types/types';

interface DeviceRequestNodeProps extends NodeProperties {
	device: string;
}

interface DeviceRequestNode extends Node {
	deviceConfigNode?: InsteonDeviceConfigNode;
	command: string;
	onLevel: Byte;
	onRamp: Byte;
}

/* Exporting Node Function */
export = function(RED: Red){
	/* Registering node type and a constructor */
	RED.nodes.registerType('insteon-device-request', function(this: DeviceRequestNode, props: DeviceRequestNodeProps){
		/* Creating actual node */
		RED.nodes.createNode(this, props);

		// Clearing status
		this.status({});

		/* Checking if we don't have a device */
		if(!props.device){
			/* Updating status */
			this.status({fill: 'red', shape: 'dot', text: 'No Device Selected'});

			/* Stopping execution */
			return;
		}

		this.status({fill: 'red', shape: 'dot', text: 'Waiting on device config'});

		/* Retrieve the config node */
		this.deviceConfigNode = RED.nodes.getNode(props.device) as InsteonDeviceConfigNode;

		/* Setting up PLM events */
		this.deviceConfigNode.on('status', p => onStatus(this, p));
		this.deviceConfigNode.on('error', s => onError(this, s));

		/* On input pass the message */
		this.on('input', msg => onInput(msg, this));
	});
};

//#region Event Functions

function onStatus(node: DeviceRequestNode, text: string){
	node.status({ fill: 'green', shape: 'dot', text });
}

function onError(node: DeviceRequestNode, text: string){
	node.status({ fill: 'red', shape: 'dot', text });
}

async function onInput(msg: any, node: DeviceRequestNode){
	const device = node.deviceConfigNode?.device as SwitchedLightingDevice;

	if(!device)
		node.error('No Device');

	let topic = msg.topic;
  let command = msg.command;

	if(topic === 'switch'){
		msg.payload = await toggle(node, device, msg);
	}
	else if(topic === 'dim'){
		msg.payload = await dim(node, device, msg);
  }
  else if(topic === 'status'){
    msg.payload = await device.getDeviceStatus();
  }
	else{
		node.error(`Unknown command: ${command}`);
  }

  node.send(msg);
}

//#endregion

//#region Command Functions

async function toggle(node: DeviceRequestNode, device: any, msg: any){

	// Grabbing status from msg payload
	const status: string = msg?.payload?.status;
	const fast: boolean  = msg?.payload?.fast ?? false;
	const level: Byte    = msg?.payload?.level ?? 0xFF;

	// Checking status for correct format
	if(status === undefined || (status !== 'off' && status !== 'on' && status != 'instant')){
		node.error('Payload or Status in incorrect format');
		return;
	}

	// Executing command
	if(status == 'on')
		return fast ? device.LightOnFast() : device.LightOn(level);
	else if(status == 'off')
		return fast ? device.LightOffFast() : device.LightOff();
	else if(status == 'instant')
		return device.InstantOnOff(level)
	else
		node.error('Payload or Status in incorrect format');
}

async function dim(node: DeviceRequestNode, device: any, msg: any){

	// Grabbing info from msg payload
	const direction: string = msg?.payload?.dim;
	const continuous: boolean = msg?.payload?.continuous;

	// Checking status for correct format
	if(direction === undefined || (direction !== 'up' && direction !== 'down' && direction !== 'stop')){
		node.error('Payload or Status in incorrect format');
		return;
	}

	// Executing command
	if(direction == 'up')
		return continuous ? device.BeginBrightening() : device.BrightenOneStep();
	else if(direction == 'down')
		return continuous ? device.BeginDimming() : device.DimOneStep();
	else if(direction == 'stop')
		return device.StopChanging()
	else
		node.error('Payload or Status in incorrect format');
}

//#endregion