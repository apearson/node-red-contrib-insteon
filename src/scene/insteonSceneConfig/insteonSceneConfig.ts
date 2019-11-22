/* Importing Libraries and types */
import { Red, NodeProperties } from 'node-red';
import { InsteonModemConfigNode, InsteonDeviceConfigNode, InsteonSceneConfigNode } from '../../types/types';
import { Byte, Packet } from 'insteon-plm';

/* Interfaces */
interface SceneConfigNodeProps extends NodeProperties {
	modem: string;
	scene: number;
}

/* Exporting Node Function */
export = function(RED: Red) {

	// Registering node type and a constructor, callback function can't be async because of node red
	RED.nodes.registerType('insteon-scene-config', function(this: InsteonSceneConfigNode, config: SceneConfigNodeProps) {
		// Creating actual node
		RED.nodes.createNode(this, config);

		// Converting config into address
		this.scene = config.scene;

		// Checking if we don't have a modem
		if(!config.modem){
			this.emit('status', 'No modem');
			return;
		}

		// Retrieve the PLMConfigNode
		this.PLMConfigNode = RED.nodes.getNode(config.modem) as InsteonModemConfigNode;

		// Setting up rest of device
		setupDevice(this);

		// Listeners
	});
};

//#region Connection Functions

async function setupDevice(node: InsteonSceneConfigNode){

	// Can't get the device if we don't have a modem
	if(!node.PLMConfigNode || !node.PLMConfigNode.plm){
		node.emit('status', 'No Modem Config');
		node.log('No modem config');
		return;
	}

	// If not connected yet, wait for connection
	if(!node.PLMConfigNode.plm.connected){
		node.PLMConfigNode.plm.once('ready', _ => setupDevice(node));
		return;
	}

	// Listeners
	node.on('close', () => onNodeClose(node));

	// Emitting all messages
	node.PLMConfigNode.plm.on('**', p => onPacket(node, p));

	// Emitting on ready
	node.log('Ready');
	node.emit('ready', 'Listening')
}

//#endregion

//#region Event Functions

function onPacket(node: InsteonSceneConfigNode, packet: Packet.Packet){
	node.emit('packet', packet);
}

function onNodeClose(node: InsteonSceneConfigNode){
	/* Closing Device */
	node.log('Closing device');
}

//#endregion