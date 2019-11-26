import { Red, NodeProperties } from 'node-red';
import { Packet } from 'insteon-plm';
import { InsteonSceneConfigNode, SceneCommandNode } from '../../types/types';


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
		this.sceneConfigNode.on('packet', p => onPacket(this, p));
		this.sceneConfigNode.on('status', p => onStatus(this, p));
		this.sceneConfigNode.on('ready', p => onReady(this, p));
	});
};

//#region Event Functions

function onStatus(node: SceneCommandNode, text: string){

	node.status({ fill: "blue", shape: 'dot', text });

	node.send({topic: 'ready', payload: text});
}

function onReady(node: SceneCommandNode, text: string){
	node.log('Ready');

	node.status({ fill: 'green', shape: 'dot', text });

	node.send({topic: 'ready', payload: text});
}

function onPacket(node: SceneCommandNode, packet: Packet.Packet){
	node.send({topic: 'packet', payload: packet});
}

//#endregion
