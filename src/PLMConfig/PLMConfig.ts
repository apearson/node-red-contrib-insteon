/* Importing Libraries and types */
import {Red, NodeProperties} from 'node-red';
import {PLM, Packets} from 'insteon-plm';
import {PLMConfigNode} from '../types/types';

/* Interfaces */
interface PLMConfigNodeProps extends NodeProperties{
	path: string;
}

/* Reconnect time settings */
let reconnectTime = 15000;

/* Exporting Node Function */
export = function(RED: Red){
	/* Settings */
	reconnectTime = RED.settings.serialReconnectTime || 15000;

	/* Registering node type and a constructor*/
	RED.nodes.registerType('PLMConfig', function(this: PLMConfigNode, props: PLMConfigNodeProps){
		/* Creating actual node */
		RED.nodes.createNode(this, props);

		/* Saving config */
		this.path = props.path;

		/* Setting up connected getter */
		Object.defineProperty(this, 'connected', { get: ()=> this.plm? this.plm.connected: false });

		/* Setting up PLM */
		setupPLM(this);
	});
};

/* Connection Function */
function setupPLM(node: PLMConfigNode){
	node.log('Setting up new PLM');

	/* Creating Insteon PLM Object */
	node.plm = new PLM(node.path);

	/* Waiting on events */
	node.plm.on('connected', ()=> onConnected(node));
	node.plm.on('disconnected', ()=> onDisconnected(node));
	node.plm.on('error', (error)=> onError(node, error));
	node.plm.on('pakcet', (packet)=> onPacket(node, packet));
}

/* Event Functions */
function onConnected(node: PLMConfigNode){
	node.log('Connected');

	/* Emitting Status */
	node.emit('connected');
}
function onDisconnected(node: PLMConfigNode){
	node.log('Disconnected');

	/* Emitting Status */
	node.emit('disconnected');

	/* Killing plm */
	node.plm = undefined;

	/* Setting up reconnection */
	setTimeout(()=> setupPLM(node), reconnectTime)
}
function onError(node: PLMConfigNode, error: Error){
	node.log('Errored');

	/* Emitting Status */
	node.emit('error', error);

	/* If PLM got disconnected, reconnect */
	if(node.plm && !node.plm.connected){
		/* Setting up reconnection */
		setTimeout(()=> setupPLM(node), reconnectTime);
	}
}
function onPacket(node: PLMConfigNode, packet: Packets.Packet){
	/* Emitting Packet */
	node.emit('packet', packet);
}