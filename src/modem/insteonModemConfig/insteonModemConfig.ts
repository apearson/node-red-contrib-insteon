/* Importing Libraries and types */
import { Red, NodeProperties } from 'node-red';
import PLM, { Byte, Packet, Utilities } from 'insteon-plm';
import { InsteonModemConfigNode } from '../../types/types';
import { Request, Response } from 'express';
import { validatePLMConnection } from '../../device/insteonDeviceConfig/configMethods';

/* Interfaces */
interface PLMConfigNodeProps extends NodeProperties {
	path: string;
}

/* Reconnect time settings */
let reconnectTime = 15000;

/* Exporting Node Function */
export = function(RED: Red){
	// Settings
	reconnectTime = RED.settings.serialReconnectTime ?? reconnectTime;

	// Registering node type and a constructor
	RED.nodes.registerType('insteon-modem-config', function(this: InsteonModemConfigNode, props: PLMConfigNodeProps){

		/* Creating actual node */
		RED.nodes.createNode(this, props);

		/* Saving config */
		this.path = props.path;
		this.errored = false;

		/* Setting up PLM */
		setupPLM(this);
	});

	// Setting up server to get serial nodes
	RED.httpAdmin.get(
		"/insteon-ports",                          // URL
		RED.auth.needsPermission('serial.read'),   // Permission
		getInsteonPorts                            // Get Devices as JSON
	);

	/* Server to provide the PLM's Link database
	 * The ajax call to this node must post the node_id of the modem config node
	 */
	RED.httpAdmin.post(
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

//#region Connection Functions

function setupPLM(node: InsteonModemConfigNode){

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

//#endregion

//#region Event Functions

function onConnected(node: InsteonModemConfigNode){
	node.log('Connected');

	node.errored = false;

	/* Emitting Status */
	node.emit('connected');
}
function onDisconnected(node: InsteonModemConfigNode){
	node.log('Disconnected');

	/* Emitting Status */
	node.emit('disconnected');

	/* Setting up reconnection */
	setTimeout(_ => setupPLM(node), reconnectTime)
}
function onError(node: InsteonModemConfigNode, error: Error){

	if(!node.errored){
		node.errored = true;
		node.log(`Error: ${error.message}`);
	}

	/* Emitting Status */
	node.emit('error', error);

	/* Setting up reconnection */
	setTimeout(_ => setupPLM(node), reconnectTime);
}
function onPacket(node: InsteonModemConfigNode, packet: Packet.Packet){
	/* Emitting Packet */
	node.emit('packet', packet);
}
function onNodeClose(node: InsteonModemConfigNode){
	/* Closing PLM */
	removeOldPLM(node);
}

//#endregion

//#region Server Functions

async function getInsteonPorts(req: Request, res: Response){

	try{
		const devices = await PLM.getPlmDevices();

		res.json(devices);
	}
	catch(e){
		res.status(500).send({message: 'An error has occured', caught: e.message});
	}

}
async function getInsteonLinks(RED: Red, req: Request, res: Response){
	/* Lookup the PLM Config Node by the node ID that was passed in via the request */
	try{
		let PLMConfigNode = validatePLMConnection(RED, req.body.id);
		
		/* Send the links back to the client */
		res.json(await PLMConfigNode?.plm?.syncLinks() ?? []);
	}
	catch(e){
		res.status(500).send({message: 'An error has occured', caught: e.message});
	}
}
async function manageDevice(RED: Red, req: Request, res: Response){
	try{
		let PLMConfigNode = validatePLMConnection(RED, req.body.id);

		/* Validate the device address */
		if(!Utilities.validateAddress(req.body.address)){
			// Server side failure
			res.status(400);
			res.json({
				message: "Invalid Insteon device address. Please use format `AA.BB.CC`"
			});
			return;
		}

		let address = Utilities.toAddressArray(req.body.address) as Byte[];

		let result: any;
		let messageVerb = "";
		let deviceCache = {} as any;
		
		if(req.body.action === 'addNewDevice'){
			result = await PLMConfigNode?.plm?.linkDevice(address);
			messageVerb = "linked";
			
			await sleep(1000);
			
			/* Get device info after we've added it */
			deviceCache.info = await PLMConfigNode.plm?.queryDeviceInfo(address);
			
			let device = await PLMConfigNode.plm?.getDeviceInstance(address, { debug: false, syncInfo: false, syncLinks: false, cache: deviceCache });
			
			deviceCache.config = await device?.readConfig();
			deviceCache.extendedConfig = await device?.readExtendedConfig();
			deviceCache.links = await device?.syncLinks();
			
		}else if(req.body.action === 'removeDevice'){
			/* Get device info before we remove it */
			deviceCache.info = await PLMConfigNode.plm!.queryDeviceInfo(address);
			
			await sleep(1000);
			
			result = await PLMConfigNode?.plm?.unlinkDevice(address);
			messageVerb = "unlinked";
		}else{
			throw new Error("Invalid action");
		}

		let links = await PLMConfigNode?.plm?.syncLinks();

		res.json({
			result: result,
			links: links,
			action: req.body.action,
			deviceCache: deviceCache,
			configNodeType: getConfigNodeType(deviceCache.info.cat, deviceCache.info.subcat),
			message: `Device ${deviceCache.info.description} was ${messageVerb}`
		});

	}
	catch(e){
		res.status(500).send({message: 'An error has occured', caught: e.message});
	}
}

//#endregion

//#region Clean up functions

function removeOldPLM(node: InsteonModemConfigNode){
	// Removing all listeners
	node.plm?.removeAllListeners();

	// Closing connection
	if(node.plm?.connected)
		node.plm.close();

	// Killing ref
	delete node.plm;
}

//#endregion

//#region Utlity Functions

/*
	Determine which config node type should be used based on the device's cat & subcat.
	This is really similar to the factory method
*/
function getConfigNodeType(cat: Byte, subcat: Byte){
	switch(Number(cat)){
		case 0x01:
			switch(Number(subcat)){
				case 0x1C: return 'insteon-keypad-dimmer-device-config';
				default: return 'insteon-dimmable-lighting-device-config';
			}

		case 0x02: return 'insteon-switched-lighting-device-config';

		case 0x07:
			switch(Number(subcat)){
				case 0x00: return 'insteon-iolinc-device-config';
				default: return 'insteon-sensor-actuator-device-config';
			}

		case 0x10:
			switch(Number(subcat)){
				case 0x01:
				case 0x03:
				case 0x04:
				case 0x05: return 'insteon-motion-sensor-device-config';

				case 0x02:
				case 0x06:
				case 0x07:
				case 0x09:
				case 0x11:
				case 0x14:
				case 0x015: return 'insteon-open-close-sensor-device-config';

				case 0x08: return 'insteon-leak-sensor-device-config';

				default: return 'insteon-security-defice-config';
			}

		default: return 'insteon-device-config';
	}
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

//#endregion