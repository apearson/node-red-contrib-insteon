import { Red, NodeProperties } from 'node-red';
import PLM, { Packet } from 'insteon-plm';
import { SubscribeNode, InsteonDeviceConfigNode } from '../types/types';

interface eventSelection {
	label: string;
	cmd1: number;
	cmd2: number;
}

interface SubscribeConfigNodeProps extends NodeProperties {
	device: string;
	selectedEvents: string[];
	subtype: string;
}


/* Exporting Node Function */
export = function(RED: Red){
	/* Fired on every deploy */
	/* Registering node type and a constructor */
	RED.nodes.registerType('subscribe', function(this: SubscribeNode, props: SubscribeConfigNodeProps){
		/* Creating actual node */
		RED.nodes.createNode(this, props);

		let node = this;

		// Clearing status
		node.status({});

		/* Checking if we don't have a device */
		if(!props.device){
			/* Updating status */
			this.status({fill: 'red', shape: 'dot', text: 'No Device Selected'});

			/* Stopping execution */
			return;
		}

		this.status({fill: 'red', shape: 'dot', text: 'Getting Config'});

		/* Retrieve the config node */
		this.deviceConfigNode = RED.nodes.getNode(props.device) as InsteonDeviceConfigNode;

		/* Setting up PLM events */
		this.deviceConfigNode.on('packet', p => onPacket(this, p));
		this.deviceConfigNode.on('ready', p => onReady(this, p));

		/* Retrieve the device config node */
		// node.deviceConfigNode = RED.nodes.getNode(config.device) as InsteonDeviceConfigNode;

		/* Retrieve the PLM config node */
		// node.PLMConfigNode = node.deviceConfigNode?.PLMConfigNode;

		// node.PLMConfigNode?.on('ready', text => {
		// 	node.status({ text, fill: 'green', shape: 'dot' });
		// });

		// node.PLMConfigNode?.on('ready', text => {
		// 	node.status({ text, fill: 'green', shape: 'dot' });
		// });

	});
};

function onReady(node: SubscribeNode, packet: Packet.Packet){
	node.log('Ready');

	node.status({ fill: 'green', shape: 'dot', text: 'Ready' });

	node.send({topic: 'ready', payload: packet});
}

function onPacket(node: SubscribeNode, packet: Packet.Packet){
	node.log('Got packet');

	node.send({topic: 'packet', payload: packet});
}

