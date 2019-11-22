import { Red, NodeProperties } from 'node-red';
import { Packet } from 'insteon-plm';
import { InsteonDeviceConfigNode, DeviceCommandNode } from '../../types/types';


interface DeviceSubscribeConfigNodeProps extends NodeProperties {
	device: string;
	selectedEvents: string[];
	subtype: string;
}

/* Exporting Node Function */
export = function(RED: Red){
	/* Registering node type and a constructor */
	RED.nodes.registerType('insteon-device-command', function(this: DeviceCommandNode, props: DeviceSubscribeConfigNodeProps){
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
		this.deviceConfigNode.on('packet', p => onPacket(this, p));
		this.deviceConfigNode.on('status', p => onStatus(this, p));
		this.deviceConfigNode.on('ready', p => onReady(this, p));
	});
};

//#region Event Functions

function onStatus(node: DeviceCommandNode, text: string){

	node.status({ fill: "blue", shape: 'dot', text });

	node.send({topic: 'ready', payload: text});
}

function onReady(node: DeviceCommandNode, text: string){
	node.log('Ready');

	node.status({ fill: 'green', shape: 'dot', text });

	node.send({topic: 'ready', payload: text});
}

function onPacket(node: DeviceCommandNode, packet: Packet.Packet){
	node.log('Got packet');

	node.send({topic: 'packet', payload: packet});
}

//#endregion
