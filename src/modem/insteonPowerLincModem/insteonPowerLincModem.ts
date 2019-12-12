/* Importing types */
import { Red, NodeProperties } from 'node-red';
import { ModemNode, InsteonModemConfigNode } from '../../types/types';
import PLM, { Packet } from 'insteon-plm';

interface insteonPLMProps extends NodeProperties{
	modem: string;
}

/* Exporting Node Function */
export = function(RED: Red){
	/* Registering node type and a constructor*/
	RED.nodes.registerType('insteon-powerlinc-modem', function(this: ModemNode, props: insteonPLMProps){

		// Creating actual node
		RED.nodes.createNode(this, props);

		// Clearing Status
		this.status({});

		// Checking if we don't have a modem
		if(!props.modem){
			/* Updating status */
			this.status({fill: 'red', shape: 'dot', text: 'No Modem Connected'});

			/* Stopping execution */
			return;
		}

		// Retrieve the config node
		this.PLMConfigNode = RED.nodes.getNode(props.modem) as InsteonModemConfigNode;

		// Setting up PLM events
		this.PLMConfigNode.on('connected', ()=> onConnected(this));
		this.PLMConfigNode.on('disconnected', ()=> onDisconnected(this));
		this.PLMConfigNode.on('error', e => onError(this, e));
		this.PLMConfigNode.on('packet', p => onPacket(this, p));

		// Setting initial status
		(this.PLMConfigNode.plm && this.PLMConfigNode.plm.connected)
			? this.status({fill: 'green', shape: 'dot', text: 'Connected'})
			: this.status({fill: 'red', shape: 'dot', text: 'Disconnected'});

		// On input pass the messag
		this.on('input', (msg) => onInput(msg, this));
	});
};

/* Connection Function */
function onConnected(node: ModemNode){
	/* Setting connected status */
	node.status({fill: 'green', shape: 'dot', text: 'Connected'});
}
function onDisconnected(node: ModemNode){
	/* Setting connected status */
	node.status({fill: 'red', shape: 'dot', text: 'Disconnected'});
}
function onError(node: ModemNode, error: Error){
	/* If PLM got disconnected, reconnect */
	if(node.PLMConfigNode.plm && node.PLMConfigNode.plm.connected){
		node.status({fill: 'red', shape: 'ring', text: 'Errored'});
	}
}
function onPacket(node: ModemNode, packet: Packet.Packet){
	node.send({topic: 'packet', payload: packet});
}

/* Node RED Processing */
async function onInput(msg: any, node: ModemNode){
	/* Output holder */
	let msgOut: any = {};

	/* Determing which processing to do */
	try{
		/* PLM short name */
		const plm = node.PLMConfigNode.plm;

		/* Check if modem is avaliable and connected */
		if(!plm || !plm.connected){
			throw new Error('Modem not connected');
		}

		/* Act on request */
		switch (msg.topic) {
			case 'info': msgOut = await getInfo(msg, plm); break;
			case 'config': msgOut = await getConfig(msg, plm); break;
			case 'links': msgOut = await getLinks(msg, plm); break;
			case 'syncInfo': msgOut = await syncInfo(msg, plm); break;
			case 'syncConfig': msgOut = await syncConfig(msg, plm); break;
			case 'syncLinks': msgOut = await syncLinks(msg, plm); break;

			case 'reset': msgOut = await reset(msg, plm); break;
			case 'sleep': msgOut = await sleep(msg,plm); break;
			case 'wake': msgOut = await wake(msg, plm); break;
			case 'close': msgOut = await close(msg, plm); break;

			case 'command': msgOut = await sendCommand(msg, plm); break;
			case 'extendedCommand': msgOut = await sendExtendedCommand(msg, plm); break;
			case 'groupCommand': msgOut = await sendGroupCommand(msg, plm); break;

			case 'addLink': msgOut = await addLink(msg, plm); break;
			case 'deleteLink': msgOut = await deleteLink(msg, plm); break;

			case 'startLinking': msgOut = await startLinking(msg, plm); break;
			case 'stopLinking': msgOut = await stopLinking(msg, plm); break;

			case 'setConfig': msgOut = await setConfig(msg, plm); break;
			case 'setCategory': msgOut = await setCategory(msg, plm); break;
			case 'setLed': msgOut = await setLed(msg, plm); break;
		}
	}
	catch(error){
		/* Setup error msg object */
		msgOut.error = error;

		/* logging out to console */
		node.error('Error processing', error);
	}

	/* Sending result */
	node.send(msgOut);
}

/* Process Functions */
async function getInfo(msg: any, plm: PLM){
	/* Getting info from modem */
	msg.payload = await plm.getInfo();

	/* Returning info */
	return msg;
}
async function getConfig(msg: any, plm: PLM){
	/* Getting info from modem */
	msg.payload = await plm.getConfig();

	/* Returning info */
	return msg;
}
async function getLinks(msg: any, plm: PLM){
	/* Getting info from modem */
	msg.payload = await plm.getAllLinks();

	/* Returning info */
	return msg;
}
async function syncInfo(msg: any, plm: PLM){
	/* Getting info from modem */
	msg.payload = await plm.syncInfo();

	/* Returning info */
	return msg;
}
async function syncConfig(msg: any, plm: PLM){
	/* Getting info from modem */
	msg.payload = await plm.syncConfig();

	/* Returning info */
	return msg;
}
async function syncLinks(msg: any, plm: PLM){
	/* Getting info from modem */
	msg.payload = await plm.syncLinks();

	/* Returning info */
	return msg;
}


async function reset(msg: any, plm: PLM){
	/* Getting info from modem */
	msg.payload = await plm.reset();

	/* Returning info */
	return msg;
}
async function sleep(msg: any, plm: PLM){
	/* Getting info from modem */
	msg.payload = await plm.sleep();

	/* Returning info */
	return msg;
}
async function wake(msg: any, plm: PLM){
	/* Getting info from modem */
	msg.payload = await plm.wake();

	/* Returning info */
	return msg;
}
async function close(msg: any, plm: PLM){
	/* Getting info from modem */
	msg.payload = await plm.close();

	/* Returning info */
	return msg;
}

async function sendCommand(msg: any, plm: PLM){
	/* Getting info from modem */
	msg.payload = await plm.sendStandardCommand(msg.device, msg.flags, msg.payload[0], msg.payload[1]);

	/* Returning info */
	return msg;
}
async function sendExtendedCommand(msg: any, plm: PLM){
	/* Getting info from modem */
	msg.payload = await plm.sendExtendedCommand(msg.device, msg.flags, msg.payload[0], msg.payload[1], msg.data);

	/* Returning info */
	return msg;
}
async function sendGroupCommand(msg: any, plm: PLM){
	/* Getting info from modem */
	msg.payload = await plm.sendAllLinkCommand(msg.group, msg.payload[0], msg.payload[1]);

	/* Returning info */
	return msg;
}

async function startLinking(msg: any, plm: PLM){
	/* Getting info from modem */
	msg.payload = await plm.startLinking(msg.type, msg.payload);

	/* Returning info */
	return msg;
}
async function stopLinking(msg: any, plm: PLM){
	/* Getting info from modem */
	msg.payload = await plm.cancelLinking();

	/* Returning info */
	return msg;
}

async function addLink(msg: any, plm: PLM){
	/* Getting info from modem */
	msg.payload = await plm.addLink(msg.device, msg.group, msg.type);

	/* Returning info */
	return msg;
}
async function deleteLink(msg: any, plm: PLM){
	/* Getting info from modem */
	msg.payload = await plm.deleteLink(msg.device, msg.group, msg.type);

	/* Returning info */
	return msg;
}

async function setConfig(msg: any, plm: PLM){
	/* Getting info from modem */
	msg.payload = await plm.setConfig(msg.payload.autoLinking, msg.payload.monitorMode, msg.payload.autoLED, msg.payload.deadman);

	/* Returning info */
	return msg;
}
async function setCategory(msg: any, plm: PLM){
	/* Getting info from modem */
	msg.payload = await plm.setCategory(msg.payload[0], msg.payload[1], msg.firmware);

	/* Returning info */
	return msg;
}
async function setLed(msg: any, plm: PLM){
	/* Getting info from modem */
	msg.payload = await plm.setLed(msg.payload);

	/* Returning info */
	return msg;
}
