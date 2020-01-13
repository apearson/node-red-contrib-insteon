/* Importing Libraries and types */
import { Red, NodeProperties } from 'node-red';
import PLM, {	
	Byte, Packet, Utilities, AllLinkRecordType, AllLinkRecordOperation, DeviceLinkRecord,
	
	InsteonDevice,

	DimmableLightingDevice,
	KeypadDimmer,

	SwitchedLightingDevice,
	OutletLinc,

	SecurityDevice,
	LeakSensor,
	MotionSensor,
	OpenCloseSensor,
	
	IOLinc,
} from 'insteon-plm';
import { InsteonModemConfigNode } from '../../types/types';
import { Request, Response } from 'express';
import { validatePLMConnection } from '../../device/insteonDeviceConfig/configMethods';

/* Interfaces */
interface PLMConfigNodeProps extends NodeProperties {
	path: string;
	address: string;
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
		this.address = props.address;
		this.name = props.name;

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
	
	/* Server to handle device configuration and link changes */
	RED.httpAdmin.post(
		"/insteon-device-config",
		RED.auth.needsPermission('serial.read'),
		(req: any, res: any) => updateDeviceConfig(RED, req, res)
	);
	
	/* Server to handle scene configuration and link changes */
	RED.httpAdmin.post(
		"/insteon-scene-config",
		RED.auth.needsPermission('serial.read'),
		(req: any, res: any) => updateSceneConfig(RED, req, res)
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
			PLMConfigNode.status({fill: 'red', shape: 'dot', text: 'Invalid address.'});
			
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
			PLMConfigNode.status({fill: 'yellow', shape: 'dot', text: 'Linking Device...'});
			try{
				result = await PLMConfigNode?.plm?.linkDevice(address);
				messageVerb = "linked";
			}catch(e){
				PLMConfigNode.status({fill: 'red', shape: 'dot', text: 'Linking failed.'});
				res.status(500).send({message: "Failed to link device", caught: e.message});
				return;
			}

			PLMConfigNode.status({fill: 'yellow', shape: 'dot', text: 'Waiting...'});

			await sleep(1000);

			PLMConfigNode.status({fill: 'yellow', shape: 'dot', text: 'Querying Device...'});
			
			try{
				/* Get device info after we've added it */
				deviceCache.info = await PLMConfigNode.plm?.queryDeviceInfo(address);
			}catch(e){
				PLMConfigNode.status({fill: 'red', shape: 'dot', text: 'Failed to Query Device...'});
				res.status(500).send({message: "Failed to get device info", caught: e.message});
				return;
			}

			PLMConfigNode.status({fill: 'yellow', shape: 'dot', text: 'Creating Device Instance...'});
			
			let device = await PLMConfigNode.plm?.getDeviceInstance(address, { debug: false, syncInfo: false, syncLinks: false, cache: deviceCache });

			PLMConfigNode.status({fill: 'yellow', shape: 'dot', text: 'Loading Device Config...'});
			
			deviceCache.config = await device?.readConfig();

			deviceCache.extendedConfig = await device?.readExtendedConfig();

			PLMConfigNode.status({fill: 'yellow', shape: 'dot', text: 'Loading Device Link Database...'});

			deviceCache.links = await device?.syncLinks();
			
		}else if(req.body.action === 'removeDevice'){
			PLMConfigNode.status({fill: 'yellow', shape: 'dot', text: 'Removing Device...'});
			try{
				/* Get device info before we remove it */
				deviceCache.info = await PLMConfigNode.plm?.queryDeviceInfo(address);
			}catch(e){
				/* don't do anything, if the device is broken we should still try and unlink it */
				PLMConfigNode.status({fill: 'red', shape: 'dot', text: 'Device did not respond...'});
			}
			
			await sleep(1000);
			
			try{
				PLMConfigNode.status({fill: 'yellow', shape: 'dot', text: 'Removing Device Link From PLM...'});
				result = await PLMConfigNode?.plm?.unlinkDevice(address);
				messageVerb = "unlinked";			
			}catch(e){
				PLMConfigNode.status({fill: 'red', shape: 'dot', text: 'Removing Device Link Failed.'});
				
				res.status(500).send({message: "Failed to unlink device", caught: e.message});
				return;
			}
		}else{
			throw new Error("Invalid action");
		}

		PLMConfigNode.status({fill: 'yellow', shape: 'dot', text: 'Loading PLM Link Database...'});

		let links = await PLMConfigNode?.plm?.syncLinks();

		PLMConfigNode.status({fill: 'green', shape: 'dot', text: 'Done.'});
		
		await sleep(500);
		
		PLMConfigNode.status({});

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
		res.status(500).send({message: 'A linking error has occured.', caught: e.message});
	}
}

async function updateDeviceConfig(RED: Red, req: Request, res: Response){
	try{		
		let PLMConfigNode = validatePLMConnection(RED, req.body.plmConfigNode);
		
		let deviceConfigNode = RED.nodes.getNode(req.body.deviceConfigNode);

		/* Validate the device address */
		if(!Utilities.validateAddress(req.body.address)){
			deviceConfigNode?.status({fill: 'red', shape: 'dot', text: 'Invalid address.'});

			// Server side failure
			res.status(400);
			res.json({
				message: "Invalid Insteon device address. Please use format `AA.BB.CC`"
			});
			return;
		}
		
		let address = Utilities.toAddressArray(req.body.address) as Byte[];

		deviceConfigNode?.status({fill: 'yellow', shape: 'dot', text: 'Loading device...'});

		let device = await PLMConfigNode.plm?.getDeviceInstance(address, { debug: false, syncInfo: false, syncLinks: false });
		
		deviceConfigNode?.status({fill: 'yellow', shape: 'dot', text: 'Updating configuration...'});
		
		/* write each of the configuration settings */
		if(req.body.changed.indexOf("programLock") !== -1)
			await (device as any)?.setProgramLock(req.body.programLock);

		if(req.body.changed.indexOf("LEDonTX") !== -1)
			await (device as any)?.setLEDonTX(req.body.LEDonTX);

		if(req.body.changed.indexOf("loadSense") !== -1)
			await (device as any)?.setLoadSense(req.body.loadSense);

		if(req.body.changed.indexOf("LEDDisabled") !== -1)
			await (device as any)?.setLEDDisabled(req.body.LEDDisabled);

		if(req.body.changed.indexOf("resumeDim") !== -1)
			await (device as any)?.setResumeDim(req.body.resumeDim);

		if(req.body.changed.indexOf("rampRate") !== -1)
			await (device as any)?.setRampRate(parseInt(req.body.rampRate) as Byte);

		if(req.body.changed.indexOf("onLevel") !== -1)
			await (device as any)?.setOnLevel(parseInt(req.body.onLevel) as Byte);
		
		/* If any links require deletion */
		if(req.body.deletedLinks.length > 0){
			deviceConfigNode?.status({fill: 'yellow', shape: 'dot', text: `Deleting Links...`});
			
			for(let i = 0; i < req.body.deletedLinks.length; i++){
				await device?.clearDatabaseRecord(req.body.deletedLinks[i]).catch(function(){ res.status(500).send({message: 'An error has occured', caught: "clearDatabaseRecord failed"}) });
			}
		}
		
		/* If any links require updating */
		if(req.body.changedLinks.length > 0){
			deviceConfigNode?.status({fill: 'yellow', shape: 'dot', text: `Updating Links...`});

			for(let i = 0; i < req.body.changedLinks.length; i++){
				let link = req.body.changedLinks[i];
				await device?.modifyDatabase(link.address, link);
			}
		}

		deviceConfigNode?.status({fill: 'yellow', shape: 'dot', text: `Reading device config...`});

		let configCache = await device?.readConfig();

		let extendedConfigCache = await device?.readExtendedConfig();

		deviceConfigNode?.status({fill: 'yellow', shape: 'dot', text: `Reading device link database...`});
		
		let linkCache = await device?.syncLinks() ?? [];
		
		/* Get the current high water link */
		let highWaterLink = linkCache.find(link => link.Type.highWater) ?? {address: []};
		
		/* Calculate which link should be the high water mark based on which links are in use */
		let calculatedHighWaterAddress = Utilities.calculateHighWaterAddress(linkCache as DeviceLinkRecord[]);
		
		/* Check to see if a new high water link is required by comparing the calculated hwm to the existing hwm */
		if(Utilities.toAddressString(calculatedHighWaterAddress) !== Utilities.toAddressString(highWaterLink.address)){
			deviceConfigNode?.status({fill: 'yellow', shape: 'dot', text: `Writing new high water mark...`});
			await device?.clearDatabaseRecord(calculatedHighWaterAddress, true);
			deviceConfigNode?.status({fill: 'yellow', shape: 'dot', text: `Re-reading device link database...`});
			linkCache = await device?.syncLinks() ?? [];
		}
		
		deviceConfigNode?.status({fill: 'green', shape: 'dot', text: `Done.`});
		
		await sleep(500);

		deviceConfigNode?.status({});

		res.json({
			address: req.body.address,
			configCache: configCache,
			extendedConfigCache: extendedConfigCache,
			linkCache: linkCache,
			message: `Device configuration was updated`
		});

	}
	catch(e){
		res.status(500).send({message: 'An error has occured', caught: e.message});
	}
}

async function updateSceneConfig(RED: Red, req: Request, res: Response){			
	try{

		let PLMConfigNode = validatePLMConnection(RED, req.body.plmConfigNode);
		let node = RED.nodes.getNode(req.body.sceneConfigNodeId);
		let devices = {} as any;
		let descriptions = [] as any;
		let data = {devices: []} as any;
		
		if(!req.body.groupMembers.length){
			node?.status({fill: 'red', shape: 'dot', text: `Scene device list was empty.`});
			throw Error("Scene device list was empty.");
		}
		
		/* Put the modem description in the descriptions list */
		descriptions[PLMConfigNode.address] = PLMConfigNode.name ?? 'Modem';
				
		/* Load all devices which are part of the scene */
		node?.status({fill: 'yellow', shape: 'dot', text: `Querying ${req.body.groupMembers.length} scene members...`});
		
		await sleep(1000);
		
		for(var i = 0; i < req.body.groupMembers.length; i++){
			let address = Utilities.toAddressArray(req.body.groupMembers[i].address) as Byte[];
			
			node?.status({fill: 'yellow', shape: 'dot', text: `Querying ${req.body.groupMembers[i].description} ...`});
			
			devices[req.body.groupMembers[i].address] = await PLMConfigNode.plm?.getDeviceInstance(address, { debug: false, syncInfo: true, syncLinks: false });
			await devices[req.body.groupMembers[i].address].syncLinks();
			
			descriptions[req.body.groupMembers[i].address] = req.body.groupMembers[i].description;
		}
		
		node?.status({fill: 'green', shape: 'dot', text: `All devices loaded!`});
		
		await sleep(1000);

		/* Process all the NEW device links */
		if(req.body.deviceLinksToAdd.length > 0){
			for(var i = 0; i < req.body.deviceLinksToAdd.length; i++){
				let newLink = req.body.deviceLinksToAdd[i];
				let device = devices[newLink.deviceAddress];
				let linkAddress = [] as Byte[];
				let addHighWater = false;

				node?.status({fill: 'yellow', shape: 'dot', text: `Adding ${newLink.control ? "controler" : "responder"} link for ${descriptions[newLink.foreignAddress]} to ${descriptions[newLink.deviceAddress]}...`});

				/* In order to add a link, we have to calculate the next available address.
				 * Loop through the links and find the first unused address (device will be 0.0.0)
				 * If none are found, write to the last position and insert a new high water mark
				 */
				for(var j = 0; j < device?.links.length; j++){
					let link = device?.links[j];

					if(Utilities.toAddressString(link.device) === '00.00.00'){
						linkAddress = link.address;

						/* Overwrite device address of the updated link in case more than one link will be added to the device in this session */
						device.links[j].device = Utilities.toAddressArray(newLink.foreignAddress);
						device.links[j].Type.highWater = false;
						device.links[j].manipulated = true;
						
						break;
					}
				}
				
				if(linkAddress.length === 0){
					let lastLinkAddress = device?.links[device?.links.length - 1].address;
					linkAddress = Utilities.nextLinkAddress(lastLinkAddress); // get the next address
					
					/* Push the new address onto the device's links array so that nextLinkAddress doesn't recycle this address */
					device.links.push({
						address: linkAddress,
						device: Utilities.toAddressArray(newLink.foreignAddress),
						group: newLink.group,
						Type: {active: true, control: newLink.controller ? AllLinkRecordType.Controller : AllLinkRecordType.Responder, smartHop: 0, highWater: false},
						onLevel: newLink.onLevel,
						rampRate: newLink.rampRate,
						type: 0x00
					});
				}
				
				/* Write the new link */
				let result = await device?.modifyDatabase(linkAddress, {
					group: newLink.group,
					device: Utilities.toAddressArray(newLink.foreignAddress),
					onLevel: newLink.onLevel,
					rampRate: newLink.rampRate,
					Type: {
						active: true,
						control: newLink.controller ? AllLinkRecordType.Controller : AllLinkRecordType.Responder,
						highWater: false
					}
				});
				
			} // End deviceLinksToAdd loop
			
			const uniqueDeviceAddresses = [...new Set(req.body.deviceLinksToAdd.map((d: any) => d.deviceAddress))];
			
			await uniqueDeviceAddresses.map(async (address: any) => {
				node?.status({fill: 'yellow', shape: 'dot', text: `Writing high water mark to ${descriptions[address]}...`});

				let device = devices[address];
				
				/* Write new highwater link */
				let highWaterAddress = Utilities.calculateHighWaterAddress(device.links);

				let result = await device?.clearDatabaseRecord(highWaterAddress, true);
			});

		}

		/* Process all CHANGED device links - should only be responder links which had a ramp/level setting change */
		if(req.body.deviceLinksToUpdate.length > 0){
			for(var i = 0; i < req.body.deviceLinksToUpdate.length; i++){
				let changeLink = req.body.deviceLinksToUpdate[i];
				let device = devices[changeLink.deviceAddress];

				node?.status({fill: 'yellow', shape: 'dot', text: `Updating ${changeLink.control ? "controler" : "responder"} link for ${descriptions[changeLink.foreignAddress]} on ${descriptions[changeLink.deviceAddress]}...`});

				/* Update the link */
				await device?.modifyDatabase(changeLink.linkAddress, {
					group: changeLink.group,
					device: Utilities.toAddressArray(changeLink.foreignAddress),
					onLevel: changeLink.onLevel,
					rampRate: changeLink.rampRate,
					Type: {
						active: true,
						control: changeLink.controller ? AllLinkRecordType.Controller : AllLinkRecordType.Responder
					}
				});
			}
		}

		/* Process all DELETED device links */
		if(req.body.deviceLinksToDelete.length > 0){
			for(var i = 0; i < req.body.deviceLinksToDelete.length; i++){
				let deleteLink = req.body.deviceLinksToDelete[i];
				let device = devices[deleteLink.deviceAddress];

				node?.status({fill: 'yellow', shape: 'dot', text: `Removing ${deleteLink.control ? "controler" : "responder"} link for ${descriptions[deleteLink.foreignAddress]} from ${descriptions[deleteLink.deviceAddress]}...`});

				await device.clearDatabaseRecord(deleteLink.linkAddress, false);

			}
		}
		
		/* Process all the NEW modem links */
		if(req.body.plmLinksToAdd.length > 0){
			for(var i = 0; i < req.body.plmLinksToAdd.length; i++){
				let newLink = req.body.plmLinksToAdd[i];
				let deviceAddress = Utilities.toAddressArray(newLink.deviceAddress);
				let operation = newLink.controller ? AllLinkRecordOperation.ModifyFirstControllerFoundOrAdd : AllLinkRecordOperation.ModifyFirstResponderFoundOrAdd;
				let type = newLink.controller ? AllLinkRecordType.Controller : AllLinkRecordType.Responder;
				const linkData = [0x00,0x00,0x00] as Byte[];

				node?.status({fill: 'yellow', shape: 'dot', text: `Adding ${newLink.control ? "controler" : "responder"} link for ${descriptions[newLink.foreignAddress]} to ${descriptions[newLink.deviceAddress]}...`});
								
				let result = await PLMConfigNode.plm?.manageAllLinkRecord(deviceAddress, newLink.group, operation, type, linkData);
				
				if(!result){
					node?.status({fill: 'red', shape: 'dot', text: `Failed to add ${newLink.control ? "controler" : "responder"} link for ${descriptions[newLink.foreignAddress]} to ${descriptions[newLink.deviceAddress]}...`});
					
				}
			}
		}
		
		/* Process all the DELETED modem links */
		if(req.body.plmLinksToDelete.length > 0){
			for(var i = 0; i < req.body.plmLinksToDelete.length; i++){
				let deleteLink = req.body.plmLinksToDelete[i];
				let deviceAddress = Utilities.toAddressArray(deleteLink.deviceAddress);
				let operation = AllLinkRecordOperation.ModifyFirstFoundOrAdd;
				let type = AllLinkRecordType.Deleted;
				const linkData = [0x00,0x00,0x00] as Byte[];

				node?.status({fill: 'yellow', shape: 'dot', text: `Deleting ${deleteLink.control ? "controler" : "responder"} link for ${descriptions[deleteLink.foreignAddress]} from ${descriptions[deleteLink.deviceAddress]}...`});

				let result = await PLMConfigNode.plm?.manageAllLinkRecord(deviceAddress, deleteLink.group, operation, type, linkData);

				if(!result){
					node?.status({fill: 'red', shape: 'dot', text: `Failed to delete ${deleteLink.control ? "controler" : "responder"} link for ${descriptions[deleteLink.foreignAddress]} from ${descriptions[deleteLink.deviceAddress]}...`});
					
				}
				
			}
		}
		
				
		for(var address in devices){
			node?.status({fill: 'yellow', shape: 'dot', text: `Refreshing ${descriptions[address]} links...`});

			let links = await devices[address].syncLinks();			
			data.devices.push({
				address,
				links
			});
		}
		
		node?.status({fill: 'green', shape: 'dot', text: `Scene update finished.`});
		
		await sleep(1000);

		node?.status({});

		res.json(data);
	}
	catch(e){
		res.status(500).send({message: 'An error has occured while updating the scene.', caught: e.message});
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