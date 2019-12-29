import logger from 'debug';
/* Configuring logging */
const debug = logger('node-red-contrib-insteon:insteonDeviceSubscribe');
debug.enabled = false;

import { Red, NodeProperties } from 'node-red';
import { Packet } from 'insteon-plm';
import { DeviceSubscribeNode, InsteonDeviceConfigNode } from '../../types/types';

interface DeviceSubscribeNodeProps extends NodeProperties {
	device: string;
	selectedEvents: string[];
	subtype: string;
}

/* Exporting Node Function */
export = function(RED: Red){
	/* Fired on every deploy */
	/* Registering node type and a constructor */
	RED.nodes.registerType('insteon-device-subscribe', function(this: DeviceSubscribeNode, props: DeviceSubscribeNodeProps){
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

		/* All, Physical or Remote commands */
		this.subtype = props.subtype;

		/* Which events to fire on */
		this.selectedEvents = props.selectedEvents;

		/* Retrieve the device config node */
		this.deviceConfigNode = RED.nodes.getNode(props.device) as InsteonDeviceConfigNode;
		
		/* If the device config node is already ready (meaning it's 'ready' event already fired before this subscribe node was created) */
		if(this.deviceConfigNode.ready){
			onReady(this,'Listening');
		}else{
			/* Wait and listen for the device to be ready */
			this.deviceConfigNode.on('ready', p => onReady(this, p));		
		}
		
	});
};

//#region Event Functions

function onReady(node: DeviceSubscribeNode, text: string){
	node.log(`Ready`);

	node.status({ fill: 'green', shape: 'dot', text });

	/* this node shouldn't output anything unless the user selected it from the GUI. Maybe add a 'ready' checkbox to the GUI? But what purpose would it serve... */
	// node.send({ topic: 'ready', payload: text });

	// Adding event listener
	node.deviceConfigNode?.device?.on(['**'], onPacket);

	// remove the event when the node is closed
	node.on('close', function(removed: boolean, done: () => void){
		// Remove event listeners
		node.deviceConfigNode?.device?.removeListener(['**'], onPacket);
		debug(`onClose removed listeners`);
		done();
	});

	function onPacket(this: any, packet: Packet.Packet){
		const event = this.event;
		const type = this.event.pop(); // The remote/physical type is always the last part of the event
		
		/* Determine whether to send based on if the event type (all/physical/remote) matches what the user subscribed to */
		if(node.subtype !== "" && node.subtype !== type) return;
		
		/* now filter based on the specific event types that were selected by the user
		 * the GUI has switched.on.fast, so we join the event array by dots and compare the strings
		 */
		
		if(node.selectedEvents.filter((e: any) => e.event === event.join('.')).length === 1){
			event.push(type); // put the type back on the event array
			node.send({
				topic: event.join('.'),
				payload: 'device level tbd',
				address: node.deviceConfigNode.address,
				device: node.deviceConfigNode.name,
				event,
				packet,
			});
		}
	}
}

//#endregion
