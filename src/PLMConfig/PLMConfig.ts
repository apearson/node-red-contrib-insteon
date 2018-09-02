/* Importing Libraries and types */
import {Red, NodeProperties} from 'node-red';
import {PLM, Packets} from 'insteon-plm';
import {PLMConfigNode} from '../types/types';

/* Interfaces */
interface PLMConfigNodeProps extends NodeProperties{
	path: string;
}

/* Exporting Node Function */
export = function(RED: Red){
	/* Registering node type and a constructor*/
	RED.nodes.registerType('PLMConfig', function(this: PLMConfigNode, props: PLMConfigNodeProps){
		/* Creating actual node */
		RED.nodes.createNode(this, props);

		/* Saving config */
		this.path = props.path;
		this.reconnectTime = RED.settings.serialReconnectTime || 15000;

		/* Setting up PLM */
		setupPLM(this);
	});
};

/* Connection Function */
function setupPLM(node: PLMConfigNode){
	/* Creating Insteon PLM Object */
	node.plm = new PLM(node.path);

	/* Waiting on events */
	node.plm.on('connected', ()=> onConnected(node));
	node.plm.on('disconnected', ()=> onDisconnected(node));
	node.plm.on('error', (error)=> onError(node, error));
	node.plm.on('packet', (packet: Packets.Packet)=> node.send({topic: 'packet', payload: packet}));
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

	/* Setting up reconnection */
	setTimeout(()=> setupPLM(node), node.reconnectTime)
}
function onError(node: PLMConfigNode, error: Error){
	node.log('Errored');

	/* Emitting Status */
	node.emit('error', error);

	/* If PLM got disconnected, reconnect */
	if(!node.plm.connected){
		/* Setting up reconnection */
		setTimeout(()=> setupPLM(node), node.reconnectTime);
	}
}