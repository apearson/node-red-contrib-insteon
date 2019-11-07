/* Importing Libraries and types */
import { Red, NodeProperties } from 'node-red';
import PLM, { Packet } from 'insteon-plm';
import { PLMConfigNode } from '../types/types';

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
		this.errored = false;

		/* Setting up connected getter */
		Object.defineProperty(this, 'connected', { get: () => this.plm? this.plm.connected : false });

		/* Setting up PLM */
		setupPLM(this);
		
	});

	/* Setting up server to get serial nodes */
	RED.httpAdmin.get(
		"/insteon-ports",                                                  // URL
		RED.auth.needsPermission('serial.read'),                           // Permission
		async (req: any, res: any) => res.json(await PLM.getPlmDevices())  // Get Devices as JSON
	);
	
	/* Server to provide the PLM's Link database
		The ajax call to this node must post the node_id of the modem config node
	*/
	RED.httpAdmin.post(
		"/insteon-plm-links",
		RED.auth.needsPermission('serial.read'),
		async (req: any, res: any) => {
			
			/* Lookup the PLM Config Node by the node ID that was passed in via the request */
			let PLMConfigNode = RED.nodes.getNode(req.body.configNodeId) as PLMConfigNode;

			/* Validate that the nodeId received is referencing a PLMConfig node */
			if(PLMConfigNode.type === 'PLMConfig'){
				/* Send the links back to the client */
				res.json({
					links: PLMConfigNode.plm!.links
				});
			}else{
				res.json({
					error: true,
					message: "Invalid config node specified."
				});
			}
		}
	);
};

/* Connection Function */
function setupPLM(node: PLMConfigNode){
	
	/* Removing old PLM */
	removeOldPLM(node);

	/* Creating Insteon PLM Object */
	node.plm = new PLM(node.path);

	/* Waiting on events */
	node.on('close', ()=> onNodeClose(node));
	node.plm.on('connected', ()=> onConnected(node));
	node.plm.on('disconnected', ()=> onDisconnected(node));
	node.plm.on('error', (error: Error)=> onError(node, error));
	node.plm.on('packet', (packet: Packet.Packet)=> onPacket(node, packet));
}

/* Event Functions */
function onConnected(node: PLMConfigNode){
	node.log('Connected');

	node.errored = false;

	/* Emitting Status */
	node.emit('connected');
}
function onDisconnected(node: PLMConfigNode){
	node.log('Disconnected');

	/* Emitting Status */
	node.emit('disconnected');

	/* Setting up reconnection */
	setTimeout(_ => setupPLM(node), reconnectTime)
}
function onError(node: PLMConfigNode, error: Error){

	if(!node.errored){
		node.errored = true;
		node.log(`Error: ${error.message}`);
	}

	/* Emitting Status */
	node.emit('error', error);

	/* Setting up reconnection */
	setTimeout(()=> setupPLM(node), reconnectTime);
}
function onPacket(node: PLMConfigNode, packet: Packet.Packet){
	/* Emitting Packet */
	node.emit('packet', packet);
}
function onNodeClose(node: PLMConfigNode){
	/* Closing PLM */
	removeOldPLM(node);
}

/* Clean up functions */
function removeOldPLM(node: PLMConfigNode){
	/* Closing PLM */
	if(node.plm){

		// Removing all listeners
		node.plm.removeAllListeners();

		// Closing connection
		if(node.plm.connected)
			node.plm.close();

		// Killing ref
		delete node.plm;
	}
}