import { Red, NodeProperties } from 'node-red';
import { InsteonDeviceConfigNode, DeviceCommandNode } from '../../typings/types';
import { dim, toggle } from '../common/functions';

interface DeviceCommandNodeProps extends NodeProperties {
	device: string;
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

		/* Setting up PLM events */
		this.deviceConfigNode.on('status', p => onStatus(this, p));
		this.deviceConfigNode.on('error', s => onError(this, s));

		/* On input pass the message */
		this.on('input', msg => onInput(msg, this));
	});
};

//#region Event Functions

function onStatus(node: DeviceCommandNode, text: string){
	node.status({ fill: 'green', shape: 'dot', text });
}

function onError(node: DeviceCommandNode, text: string){
	node.status({ fill: 'red', shape: 'dot', text });
}

async function onInput(msg: any, node: DeviceCommandNode){
	const device = node.deviceConfigNode?.device as any;

	if(!device)
		node.error('No Device');

	let topic = msg.topic;
	let command = msg.command;

	if(topic === 'switch'){
		toggle(node, device, msg);
	}
	else if(topic === 'dim'){
		dim(node, device, msg);
	}
	else{
		node.error(`Unknown command: ${command}`);
	}
}

//#endregion