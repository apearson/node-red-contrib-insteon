/* Importing Libraries and types */
import { Red, NodeProperties } from 'node-red';
import PowerLincModem, { Byte, Packet, Utilities } from 'insteon-plm';
import { InsteonModemConfigNode } from '../../typings/types';
import { Request, Response } from 'express';

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
		"/insteon/modem/links",
		RED.auth.needsPermission('serial.read'),
		(req: any, res: any) => getInsteonLinks(RED, req, res)
	);

	RED.httpAdmin.get(
		"/insteon/device/type",
		RED.auth.needsPermission('serial.read'),
		(req: any, res: any) => getDeviceType(RED, req, res)
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

			const info = PowerLincModem.getDeviceInfo(plm.info.devcat, plm.info.subcat, plm.info.firmware);
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

async function getDeviceType(RED: Red, req: Request, res: Response){

	const address = req.query.address.split('.').map((_: string) => parseInt(_, 16));
	const modemId = req.query.modemId;

	try{
		let PLMConfigNode = RED.nodes.getNode(modemId) as InsteonModemConfigNode;

		const info = await PLMConfigNode?.plm?.queryDeviceInfo(address, {syncInfo: true, syncLinks: false, debug: false});

		if(!info)
			res.status(500).send({message: 'An error has occured while getting device info'});

		/* Send the links back to the client */
		res.json(info);
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