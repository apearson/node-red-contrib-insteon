import { Red, NodeProperties } from 'node-red';
import { InsteonSceneConfigNode, SceneCommandNode } from '../../typings/types';
import PowerLincModem, { Byte } from 'insteon-plm';

interface SceneSubscribeConfigNodeProps extends NodeProperties {
	scene: string;
}

/* Exporting Node Function */
export = function(RED: Red){
	/* Registering node type and a constructor */
	RED.nodes.registerType('insteon-scene-command', function(this: SceneCommandNode, props: SceneSubscribeConfigNodeProps){
		/* Creating actual node */
		RED.nodes.createNode(this, props);

		// Clearing status
		this.status({});

		/* Checking if we don't have a device */
		if(!props.scene){
			/* Updating status */
			this.status({fill: 'red', shape: 'dot', text: 'No Scene Selected'});

			/* Stopping execution */
			return;
		}

		/* Retrieve the config node */
		this.sceneConfigNode = RED.nodes.getNode(props.scene) as InsteonSceneConfigNode;

		/* Setting up PLM events */
		this.sceneConfigNode.on('ready', p => onReady(this, p));

		// Listening for msgs
		this.on('input', (msg) => onInput(msg, this));
	});
};

//#region Event Functions

function onReady(node: SceneCommandNode, text: string){
	node.status({ fill: 'green', shape: 'dot', text });

	node.send({topic: 'ready', payload: text});
}

//#endregion

//#region Input Functions

async function onInput(msg: any, node: SceneCommandNode){

	// Grabbing PLM
	const plm = node.sceneConfigNode?.PLMConfigNode?.plm;

	// Checking we have a modem
	if(plm === undefined){
		node.status({ fill: 'red', shape: "dot", text: 'No Modem' });
		return;
	}

	// Grabbing scene to command
	const scene = node.sceneConfigNode?.scene as Byte;

	// Checking we have a scene
	if(scene === undefined){
		node.status({ fill: 'red', shape: "dot", text: 'No scene selected' });
		return;
	}

	// Determining what action to take
	if(msg.topic === 'switch'){
		await toggle(node, msg, plm, scene);
	}
}

//#endregion

//#region Commands

async function toggle(node: SceneCommandNode, msg: any, plm: PowerLincModem, scene: Byte){

	node.log("Toggling");

	// Grabbing status from msg payload
	const status: string = msg?.payload?.status;
	const fast: boolean = msg?.payload?.fast || false;

	// Checking status for correct format
	if(status === undefined || (status !== 'off' && status !== 'on')){
		node.error('Payload or Status in incorrect format');
		return;
	}

	// Command set
	const on  = !fast? 0x11 : 0x12;
	const off = !fast? 0x13 : 0x14;

	const brighten = [0x15, 0x00];
	const dim = [0x16, 0x00];

	const startChange = 0x17;
	const stopChange = 0x18;

	// Determining bytes
	const cmd = status.trim() === 'on'? [on, 0xff] : [off, 0x00];

	// Sending command
	const ack = await plm.sendAllLinkCommand(scene, cmd[0] as Byte, cmd[1] as Byte);

	if(!ack){
		node.log('Could not execute command');
	}
}

//#endregion