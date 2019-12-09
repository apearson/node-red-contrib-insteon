/* Importing Libraries and types */
import { Red, NodeProperties } from 'node-red';
import { Byte, Utilities, SwitchedLightingDevice } from 'insteon-plm';
import { InsteonModemConfigNode, InsteonDeviceConfigNode } from '../../../types/types';
import { Request, Response } from 'express';
import { setupDevice, DeviceConfigNodeProps, validatePLMConnection } from '../configMethods';


/* Exporting Node Function */
export = function(RED: Red) {

	// Registering node type and a constructor, callback function can't be async because of node red. Fired on every deploy of the node.
	RED.nodes.registerType('insteon-switched-lighting-device-config', function(this: InsteonDeviceConfigNode, config: DeviceConfigNodeProps) {
		// Setting up the device
		setupDevice(RED, this, config);
	});
	
	/* Server to handle switched lighting device config changes */
	RED.httpAdmin.post(
		"/insteon-switched-lighting-device-config",
		RED.auth.needsPermission('serial.read'),
		(req: any, res: any) => updateDeviceConfig(RED, req, res)
	);
	
};

async function updateDeviceConfig(RED: Red, req: Request, res: Response){
	try{		
		let PLMConfigNode = validatePLMConnection(RED, req.body.plmConfigNode);

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

		let device = await PLMConfigNode.plm?.getDeviceInstance(address, { debug: false, syncInfo: false, syncLinks: false }) as SwitchedLightingDevice;
				
		/* write each of the configuration settings */
		await device?.setProgramLock(req.body.programLock);
		await device?.setLEDonTX(req.body.LEDonTX);
		await device?.setLoadSense(req.body.loadSense);
		await device?.setLEDDisabled(req.body.LEDDisabled);
		
		let configCache = await device?.readConfig();
		
		res.json({
			configCache: configCache,
			message: `Device configuration was updated`
		});

	}
	catch(e){
		res.status(500).send({message: 'An error has occured', caught: e.message});
	}
}
