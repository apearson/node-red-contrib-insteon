import { Red, NodeProperties } from 'node-red';
import { Packet } from 'insteon-plm';
import { DeviceSubscribeNode, InsteonDeviceConfigNode } from '../../types/types';


interface SubscribeConfigNodeProps extends NodeProperties {
	device: string;
	selectedEvents: string[];
	subtype: string;
}

/* Exporting Node Function */
export = function(RED: Red){
	/* Fired on every deploy */
	/* Registering node type and a constructor */
	RED.nodes.registerType('insteon-device-subscribe', function(this: DeviceSubscribeNode, props: SubscribeConfigNodeProps){
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
		this.deviceConfigNode.on('ready', p => onReady(this, p));
	});
};

//#region Event Functions

function onReady(node: DeviceSubscribeNode, text: string){
	node.log(`Ready`);

	node.status({ fill: 'green', shape: 'dot', text });

	node.send({topic: 'ready', payload: text});

	// Adding event listeners
	node.deviceConfigNode?.device?.on(['packet', '**'], function (this: any, p){ onPacket(node, this.event, p) });
	node.deviceConfigNode?.device?.on(['switch', '**'], function (this: any, p){ onSwitch(node, this.event, p) });
	node.deviceConfigNode?.device?.on(['dim', '**' ], function (this: any, p){ onSwitch(node, this.event, p) });
}

function onPacket(node: DeviceSubscribeNode, event: string[], packet: Packet.Packet){
	node.log('Got packet');

	node.send({topic: 'packet', payload: packet});
}

function onSwitch(node: DeviceSubscribeNode, event: string[], packet: Packet.Packet){
	node.send({
		topic: event[0],
		payload: {
			status: event[1],
			type: event[2],
		},
		event,
		packet,
	});
}

//#endregion
