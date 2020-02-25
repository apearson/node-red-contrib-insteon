import { Red, NodeProperties, Node } from 'node-red';
import { Packet } from 'insteon-plm';
import { InsteonDeviceConfigNode } from '../../types/types';

interface SubscribeConfigNodeProps extends NodeProperties {
	device: string;
}

interface DeviceSubscribeNode extends Node {
	deviceConfigNode?: InsteonDeviceConfigNode;
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
		this.deviceConfigNode.on('status', p => onStatus(this, p));
	});
};

//#region Event Functions
function onStatus(node: DeviceSubscribeNode, text: string){
	text === 'Ready' ? onReady(node, text)
	: node.error('Non supported status code:' + text);
}


function onReady(node: DeviceSubscribeNode, text: string){
	node.log(`Ready`);

	node.status({ fill: 'green', shape: 'dot', text });

	node.send({ topic: 'ready', payload: text });

	// Adding event listeners
	node.deviceConfigNode?.device?.on(['packet', '**'], function (this: any, p){ onPacket(node, this.event, p) });

	// Device events
	node.deviceConfigNode?.device?.on(['switch', '**'], function (this: any, p){ onSwitch(node, this.event, p) });
	node.deviceConfigNode?.device?.on(['dim', '**' ], function (this: any, p){ onDim(node, this.event, p) });
	node.deviceConfigNode?.device?.on(['sensor', '**' ], function (this: any, p){ onSensor(node, this.event, p) });
	node.deviceConfigNode?.device?.on(['heartbeat', '**' ], function (this: any, p){ onHeartbeat(node, this.event, p) });
	node.deviceConfigNode?.device?.on(['battery', '**' ], function (this: any, p){ onBattery(node, this.event, p) });
	node.deviceConfigNode?.device?.on(['motion', '**' ], function (this: any, p){ onMotion(node, this.event, p) });
	node.deviceConfigNode?.device?.on(['light', '**' ], function (this: any, p){ onLight(node, this.event, p) });
}

function onPacket(node: DeviceSubscribeNode, event: string[], packet: Packet.Packet){
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

function onDim(node: DeviceSubscribeNode, event: string[], packet: Packet.Packet){
	node.send({
		topic: event[0],
		payload: {
			status: event[1],
		},
		event,
		packet,
	});
}

function onSensor(node: DeviceSubscribeNode, event: string[], packet: Packet.Packet){
	node.send({
		topic: event[0],
		payload: {
			status: event[1],
		},
		event,
		packet,
	})
}

function onHeartbeat(node: DeviceSubscribeNode, event: string[], packet: Packet.Packet){
	node.send({
		topic: event[0],
		payload: {
			status: event[1],
		},
		event,
		packet,
	})
}

function onBattery(node: DeviceSubscribeNode, event: string[], packet: Packet.Packet){
	node.send({
		topic: event[0],
		payload: {
			status: event[1],
		},
		event,
		packet,
	})
}

function onMotion(node: DeviceSubscribeNode, event: string[], packet: Packet.Packet){
	node.send({
		topic: event[0],
		payload: {
			status: event[1],
		},
		event,
		packet,
	})
}

function onLight(node: DeviceSubscribeNode, event: string[], packet: Packet.Packet){
	node.send({
		topic: event[0],
		payload: {
			status: event[1],
		},
		event,
		packet,
	})
}

//#endregion
