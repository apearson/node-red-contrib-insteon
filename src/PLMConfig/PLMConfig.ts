/* Importing Libraries and types */
import { Red, NodeProperties } from 'node-red';
import PLM, { Packets } from 'insteon-plm';
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
		
		/* Amateur Hour */
		/* Keep track of all devices nodes which the user added to the flow
		   When an insteon packet is received which matches the device node
		   address, we route the packet to it so the node can update it's state
		 */
		this._devices = [];
		
		/* Fired when user deploys a device node */
		this.addDevice = function(deviceNode){
			/* Don't allow the user to add the same device multiple times. 
			   One physical device = one device node. */
			let duplicate = this._devices.filter(obj => obj.address.toString() === deviceNode.address.toString());
			if(duplicate.length !== 0){
				deviceNode.status({fill: 'red', shape: 'dot', text: 'Address already used by: '+ RED.nodes.getNode(duplicate[0].id).name});
				return false;
			}
			
			// this._devices.push({id: deviceNode.id, address: deviceNode.address});
			this._devices.push(deviceNode);
		}
		
		/* Fired when user deletes/changes a device node */
		this.removeDevice = function(deviceNode){
			this._devices = this._devices.filter(obj => obj.id !== deviceNode.id);
		}

		
	});

	/* Setting up server to get serial nodes */
	RED.httpAdmin.get(
		"/insteon-ports",                                                  // URL
		RED.auth.needsPermission('serial.read'),                           // Permission
		async (req: any, res: any) => res.json(await PLM.getPlmDevices())  // Get Devices as JSON
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
	node.plm.on('packet', (packet: Packets.Packet)=> onPacket(node, packet));
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
function onPacket(node: PLMConfigNode, packet: Packets.Packet){
	/* Amateur hour continued */
	/* Packets emitted from the modem which have a from address tell us that the device state was updated.
	   Route these packets to the Device node with the same address
	*/
	if(Array.isArray(packet.from)){
		node._devices.filter(device => device.address.toString() === packet.from.toString())
			.map(device => device.updateState(packet));
	}
	
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