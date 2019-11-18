/* Importing Libraries and types */
import { Red, NodeProperties } from 'node-red';
import PLM, { Byte, Packet, Utilities } from 'insteon-plm';
import { PLMConfigNode } from '../types/types';
import { Request, Response, NextFunction } from 'express';

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
		"/insteon-ports",                          // URL
		RED.auth.needsPermission('serial.read'),   // Permission
		getInsteonPorts                            // Get Devices as JSON
	);

	/* Server to provide the PLM's Link database
	 * The ajax call to this node must post the node_id of the modem config node
	 */
	RED.httpAdmin.get(
		"/insteon-plm-getlinks",
		RED.auth.needsPermission('serial.read'),
		(req: any, res: any) => getInsteonLinks(RED, req, res)
	);

	/* Server to link or unlink a device from the PLM's Link database
	 * The ajax call to this node must post the node_id of the modem config node
	 */
	RED.httpAdmin.post(
		"/insteon-plm-manage-device",
		RED.auth.needsPermission('serial.read'),
		(req: any, res: any) => manageDevice(RED, req, res)
	);
};

/* Connection Function */
function setupPLM(node: PLMConfigNode){

	/* Removing old PLM */
	removeOldPLM(node);

	/* Creating Insteon PLM Object */
	node.plm = new PLM(node.path);

	/* Waiting on events */
	node.on('close', () => onNodeClose(node));
	node.plm.on('connected', () => onConnected(node));
	node.plm.on('disconnected', () => onDisconnected(node));
	node.plm.on('error', (error: Error) => onError(node, error));
	node.plm.on('packet', (packet: Packet.Packet) => onPacket(node, packet));
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
	setTimeout(_ => setupPLM(node), reconnectTime);
}
function onPacket(node: PLMConfigNode, packet: Packet.Packet){
	/* Emitting Packet */
	node.emit('packet', packet);
}
function onNodeClose(node: PLMConfigNode){
	/* Closing PLM */
	removeOldPLM(node);
}

/* Server functions */
async function getInsteonPorts(req: Request, res: Response){
	res.json(await PLM.getPlmDevices());
}
async function getInsteonLinks(RED: Red, req: Request, res: Response){

	/* Lookup the PLM Config Node by the node ID that was passed in via the request */
	let PLMConfigNode = validatePLMConnection(RED, req.query.id, res);

	if(PLMConfigNode != null){
		/* Send the links back to the client */
		res.json(PLMConfigNode?.plm?.links ?? []);
	}
}
async function manageDevice(RED: Red, req: Request, res: Response){
	let PLMConfigNode = validatePLMConnection(RED, req.body.configNodeId, res);
	let message = "";

	/* Validate the device address */
	let address = Utilities.toAddressArray(req.body.address) as Byte[];
	if(address.length !== 3){
		res.json({
			error: true,
			message: "Invalid Insteon device address. Please use format `AA.BB.CC`"
		});
		return;
	}

	try{
		/* Something strange is happening here -
			queryDeviceInfo only works sometimes, othertimes it hangs indefinitely
			unmanageDevice doesn't seem to have any effect on the link database
		*/

		let result: any;
		let messageVerb = "";
		if(req.body.action === 'addNewDevice'){
			result = await PLMConfigNode?.plm?.linkDevice(address);
			let messageVerb = "linked";
			/* Get device info after we've added it */
			// let deviceInfo = await PLMConfigNode.plm!.queryDeviceInfo(address);
		}else if(req.body.action === 'removeDevice'){
			/* Get device info before we remove it */
			// let deviceInfo = await PLMConfigNode.plm!.queryDeviceInfo(address);
			result = await PLMConfigNode?.plm?.unlinkDevice(address);
			messageVerb = "unlinked";
		}else{
			throw new Error("Invalid action");
		}

		let links = await PLMConfigNode?.plm?.syncLinks();

		res.json({
			result: result,
			links: links,
			// deviceInfo: deviceInfo,
			// message: `Device ${deviceInfo.description} was ${messageVerb}`
			message: `Device was ${messageVerb}`
		});
	} catch(e){
		res.json({
			error: true,
			caught: e,
			message: "Failed to update links"
		});
		return;
	}
}

/* Clean up functions */
function removeOldPLM(node: PLMConfigNode){
	// Removing all listeners
	node.plm?.removeAllListeners();

	// Closing connection
	if(node.plm?.connected)
		node.plm.close();

	// Killing ref
	delete node.plm;
}

/* Function that takes a node.id and returns the node if it is valid
 * The node must be a PLMConfig node, and the PLM must be connected
 */
function validatePLMConnection(RED: Red, configNodeId: string, res: Response){
	/* Lookup the PLM Config Node by the node ID that was passed in via the request */
	let PLMConfigNode = RED.nodes.getNode(configNodeId) as PLMConfigNode;

	/* Validate that the nodeId received is referencing a PLMConfig node */
	if(PLMConfigNode == null || PLMConfigNode.type !== 'PLMConfig' ){
		res.json({
			error: true,
			message: "Invalid config node specified."
		});

		return null;
	}

	/* Check to see if the Config Node is connected to the PLM. If the node hasn't been deployed yet, it won't be connected
	 * The best thing would be to connect, get/return the links then disconnect, but for now we will just send an error
	 */
	if(PLMConfigNode.plm === null || !PLMConfigNode.plm?.connected){
		res.json({
			error: true,
			message: "The PLM is not connected. Cannot load links."
		});

		return null;
	}

	return PLMConfigNode;
}