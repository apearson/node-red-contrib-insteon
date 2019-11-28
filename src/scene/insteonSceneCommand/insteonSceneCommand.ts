import { Red, NodeProperties } from 'node-red';
import { InsteonSceneConfigNode, SceneCommandNode } from '../../types/types';
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
	node.log('Ready');

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

	// Grabbing status from msg payload
	const status = msg?.payload?.status;

	// Checking status for correct format
	if(status === undefined || (status !== 'off' && status !== 'on')){
		node.error('Payload or Status in incorrect format');
		return;
	}

	const turnOn = [0x11, 0xFF] as Byte[];
	const turnOff = [0x13, 0x00] as Byte[];

	// Determining bytes
	const cmd = status.trim() === 'on'? turnOn : turnOff;

	// Sending command
	const ack = await plm.sendAllLinkCommand(scene, cmd[0], cmd[1]);

	if(!ack){
		node.log('Could not execute command');
	}
}

//#endregion