/* Importing Libraries and types */
import { Red, NodeProperties } from 'node-red';
import PowerLincModem, { Byte, Packet, Utilities, DeviceLinkRecord } from 'insteon-plm';
import { InsteonModemConfigNode, InsteonDeviceConfigNode } from '../../typings/types';
import { Request, Response } from 'express';
import * as flatCache  from 'flat-cache';


/* Interfaces */
interface PLMConfigNodeProps extends NodeProperties {
	path: string;
}

/* Reconnect time settings */
let reconnectTime = 15000;
const cache = flatCache.load('insteon');


/* Exporting Node Function */
export = function(RED: Red){
	// Settings
	reconnectTime = RED.settings.serialReconnectTime ?? reconnectTime;

	// Registering node type and a constructor
	RED.nodes.registerType('insteon-modem-config', function(this: InsteonModemConfigNode, props: PLMConfigNodeProps){

		console.log(RED.settings.userDir);

		/* Creating actual node */
		RED.nodes.createNode(this, props);

		/* Saving config */
		this.path = props.path;
		this.errored = false;

		/* Setting up PLM */
		setupPLM(this);
	});

	//#region Server Routes

	RED.httpAdmin.get(
		"/insteon/ports",
		RED.auth.needsPermission('serial.read'),
		getInsteonPorts
	);

	RED.httpAdmin.get(
		'/insteon/modem/info',
		RED.auth.needsPermission('serial.read'),
		(req: any, res: any) => getInsteonInfo(RED, req, res)
	);

	RED.httpAdmin.get(
		'/insteon/modem/config',
		RED.auth.needsPermission('serial.read'),
		(req: any, res: any) => getInsteonConfig(RED, req, res)
	);

	RED.httpAdmin.get(
		"/insteon/modem/links",
		RED.auth.needsPermission('serial.read'),
		(req: any, res: any) => getInsteonLinks(RED, req, res)
	);

	RED.httpAdmin.get(
		"/insteon/device/type",
		RED.auth.needsPermission('serial.read'),
		(req: any, res: any) => getDeviceType(RED, req, res)
	);

	RED.httpAdmin.get(
		"/insteon/device/database",
		RED.auth.needsPermission('serial.read'),
		(req: any, res: any) => getDeviceDatabase(RED, req, res)
	);

	RED.httpAdmin.post(
		"/insteon/device/manage",
		RED.auth.needsPermission('serial.read'),
		(req: any, res: any) => manageDevice(RED, req, res)
	);

	//#endregion
};

//#region Connection Functions

function setupPLM(node: InsteonModemConfigNode){

	/* Removing old PLM */
	removeOldPLM(node);

	/* Creating Insteon PLM Object */
	node.plm = new PowerLincModem(node.path);
	node.plm.setMaxListeners(1000);

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

	node.emit('connected');
}

function onDisconnected(node: InsteonModemConfigNode){
	node.log('Disconnected');

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
	node.emit('packet', packet);
}

function onNodeClose(node: InsteonModemConfigNode){
	removeOldPLM(node);
}

//#endregion

//#region Server Functions

async function getInsteonPorts(req: Request, res: Response){

	try{
		const devices = await PowerLincModem.getPlmDevices();

		res.json(devices);
	}
	catch(e){
		res.status(500).send({message: 'An error has occured', error: e});
	}
}

async function getInsteonLinks(RED: Red, req: Request, res: Response){
	/* Lookup the PLM Config Node by the node ID that was passed in via the request */
	try{
		let PLMConfigNode = RED.nodes.getNode(req.query.id) as InsteonModemConfigNode;

		/* Send the links back to the client */
		res.json(PLMConfigNode?.plm?.links ?? []);
	}
	catch(e){
		res.status(500).send({message: 'An error has occured', error: e});
	}
}

async function manageDevice(RED: Red, req: Request, res: Response){

	try{
		let PLMConfigNode = RED.nodes.getNode(req.query.id) as InsteonModemConfigNode;

		/* Validate the device address */
		let address = Utilities.toAddressArray(req.query.address) as Byte[];
		if(address.length !== 3){
			// Server side failure
			res.status(400);
			res.json({
				message: "Invalid Insteon device address. Please use format `AA.BB.CC`"
			});
			return;
		}

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

	}
	catch(e){
		res.status(500).send({message: 'An error has occured', error: e});
	}
}

async function getInsteonInfo(RED: Red, req: Request, res: Response){
	/* Lookup the PLM Config Node by the node ID that was passed in via the request */
	try{
		let path = req.query.path;

		const plm = new PowerLincModem(path, {syncConfig: false, syncLinks: false});

		plm.on('ready', () => {

			const info = PowerLincModem.getFullDeviceInfo(plm.info.devcat, plm.info.subcat, plm.info.firmware);
			const id = plm.info.id
			res.json({
				id,
				info
			});

			plm.close();
		});

		plm.on('error', (e) => {
			res.status(500).send({message: 'Error getting info', error: e});

			plm.close();
		})
	}
	catch(e){
		console.error(e);
		res.status(500).send({message: 'An error has occured', error: e});
	}
}

async function getInsteonConfig(RED: Red, req: Request, res: Response){
	/* Lookup the PLM Config Node by the node ID that was passed in via the request */
	try{
		let PLMConfigNode = RED.nodes.getNode(req.query.id) as InsteonModemConfigNode;

		const config = PLMConfigNode?.plm?.config;

		if(config == undefined)
			throw Error('Could not get config from plm.  PLM is not ready');

		/* Send the config back to the client */
		res.json(config);
	}
	catch(e){
		res.status(500).send({message: 'An error has occured', error: e});
	}
}

async function getDeviceType(RED: Red, req: Request, res: Response){

	const address = req.query.address.split('.').map((_: string) => parseInt(_, 16));
	const modemId = req.query.modemId;

	try{
		let PLMConfigNode = RED.nodes.getNode(modemId) as InsteonModemConfigNode;

		const info = await PLMConfigNode?.plm?.queryFullDeviceInfo(address);

		if(!info)
			res.status(500).send({message: 'An error has occured while getting device info'});

		/* Send the links back to the client */
		res.json(info);
	}
	catch(e){
		res.status(500).send({message: 'An error has occured', error: e});
	}
}

async function getDeviceDatabase(RED: Red, req: Request, res: Response){

	const deviceId = req.query.deviceId;
	const refresh = req.query.refresh === 'true';

	try{
		const DeviceConfigNode = RED.nodes.getNode(deviceId) as InsteonDeviceConfigNode;

		const address = Utilities.toAddressString(DeviceConfigNode.address);
		const cacheKey = `${address}:db`;

		let database: DeviceLinkRecord[] | null;

		// If we are not told to refresh and the cache includes the db
		if(!refresh){
			database = cache.keys().includes(cacheKey) ? cache.getKey(cacheKey) : [];
		}
		else{ // Else get database from device
			database = await DeviceConfigNode?.device?.getDatabase() ?? null;

			if(database){
				cache.setKey(cacheKey, database);
				cache.save(true);
			}
		}

		/* Send the links back to the client */
		database ? res.json(database)
		         : res.status(500).send({message: 'An error has occured while getting device database'});
	}
	catch(e){
		res.status(500).send({message: 'An error has occured', error: e});
	}

}

async function getDeviceConfiguration(RED: Red, req: Request, res: Response){

	const deviceId = req.query.deviceId;
	const refresh = req.query.refresh === 'true';

	try{
		const DeviceConfigNode = RED.nodes.getNode(deviceId) as InsteonDeviceConfigNode;

		const address = Utilities.toAddressString(DeviceConfigNode.address);
		const cacheKey = `${address}:config`;

		let config = {};

		// If we are not told to refresh and the cache includes the db
		if(!refresh){
			config = cache.keys().includes(cacheKey) ? cache.getKey(cacheKey) : {};
		}
		else{ // Else get database from device
			// database = await DeviceConfigNode?.device?.getDeviceConfiguration() ?? null;

			// if(database){
			// 	cache.setKey(cacheKey, database);
			// 	cache.save(true);
			// }
		}

		/* Send the links back to the client */
		config ? res.json(config)
		         : res.status(500).send({message: 'An error has occured while getting device config'});
	}
	catch(e){
		res.status(500).send({message: 'An error has occured', error: e});
	}
}

//#endregion

//#region Clean up functions

function removeOldPLM(node: InsteonModemConfigNode){
	node.plm?.removeAllListeners();

	if(node.plm?.connected)
		node.plm.close();

	delete node.plm;
}

//#endregion

//#region Utlity Functions

//#endregion