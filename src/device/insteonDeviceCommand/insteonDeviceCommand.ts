import { Red, NodeProperties } from 'node-red';
import { Byte, Packet } from 'insteon-plm';
import { InsteonDeviceConfigNode, DeviceCommandNode } from '../../types/types';

interface DeviceCommandNodeProps extends NodeProperties {
	device: string;
	command: string;
	onLevel: string;
}

/* Exporting Node Function */
export = function(RED: Red){
	/* Registering node type and a constructor */
	RED.nodes.registerType('insteon-device-command', function(this: DeviceCommandNode, props: DeviceCommandNodeProps){
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
		
		/* The command to be executed */
		this.command = props.command;
		
		/* The onLevel to use (only valid for dimmers and when the command is 'on') */
		this.onLevel = Math.round(parseInt(props.onLevel) / 100 * 255) as Byte;
		
		/* The onRamp is only used for the dimmers which support LightOnAtRate */
		// this.onRamp = 0x99;
		
		/* If the device config node is already ready (meaning it's 'ready' event already fired before this subscribe node was created) */
		if(this.deviceConfigNode.ready){
			onReady(this,'Listening');
		}else{
			/* Wait and listen for the device to be ready */
			this.deviceConfigNode.on('ready', p => onReady(this, p));		
		}

		/* On input pass the message */
		this.on('input', (msg) => onInput(msg, this));
	});
};

//#region Event Functions

function onReady(node: DeviceCommandNode, text: string){	
	node.log('Ready');

	node.status({ fill: 'green', shape: 'dot', text });
}

function onInput(msg: any, node: DeviceCommandNode){
	let device = node.deviceConfigNode?.device as any;
	
	let command = node.command === '' ? msg.payload : node.command;
	let level = Number.isInteger(msg.level) ? Math.round(msg.level / 100 * 255) as Byte : node.onLevel;
	
	switch(command){
		case 'on':                  device?.LightOn(level); break;
		case 'off':                 device?.LightOff(); break;
		case 'on-fast':             device?.LightOnFast(level); break;
		case 'off-fast':            device?.LightOffFast(); break;
		case 'instant':             device?.InstantOnOff(level); break;
		case 'dim-step-up':         device?.BrightenOneStep(); break;
		case 'dim-step-down':       device?.DimOneStep(); break;
		case 'dim-continuous-up':   device?.BeginBrightening(); break;
		case 'dim-continuous-down': device?.BeginDimming(); break;
		case 'dim-continuous-stop': device?.StopChanging(); break;
		// case 'dim-to-at-rate':      device?.LightOnAtRate(0x05, 0x03); break; NOT working at the moment
		default: node.error(`Unknown command: ${command}`);
	}
}

//#endregion
