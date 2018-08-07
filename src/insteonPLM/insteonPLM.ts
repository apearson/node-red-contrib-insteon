/* Importing types */
import {Red, Node, NodeProperties} from 'node-red';
import {PLMNode, PLMConfigNode} from '../types/types';
import {PLM} from 'insteon-plm';

interface insteonPLMProps extends NodeProperties{
	modem: string;
}

/* Exporting Node Function */
export = function(RED: Red){
	/* Registering node type and a constructor*/
	RED.nodes.registerType('Insteon-PLM', function(this: PLMNode, props: insteonPLMProps){
		/* Creating actual node */
		RED.nodes.createNode(this, props);

		// Retrieve the config node
		this.PLMConfigNode = RED.nodes.getNode(props.modem) as PLMConfigNode;

		/* Waiting on connected event */
		this.PLMConfigNode.plm.on('connected', ()=>{
			this.log('Connected');
			/* Setting connected status */
			this.status({fill: 'green', shape: 'ring', text: 'Connected'});
		});

		/* Setting inital status */
		this.log('Init');
		this.status({fill: 'red', shape: 'ring', text: 'Not Connected'});

		/* On input */
		this.on('input', async (msg)=>{
			/* Output holder */
			let msgOut;

			/* Determing which processing to do */
			switch (msg.topic) {
				case 'info': msgOut = await getInfo(msg, this.PLMConfigNode.plm); break;
				case 'config': msgOut = await getConfig(msg, this.PLMConfigNode.plm); break;
				case 'links': msgOut = await getLinks(msg, this.PLMConfigNode.plm); break;
				case 'syncInfo': msgOut = await syncInfo(msg, this.PLMConfigNode.plm); break;
				case 'syncConfig': msgOut = await syncConfig(msg, this.PLMConfigNode.plm); break;
				case 'syncLinks': msgOut = await syncLinks(msg, this.PLMConfigNode.plm); break;

				case 'reset': msgOut = await reset(msg, this.PLMConfigNode.plm); break;
				case 'sleep': msgOut = await sleep(msg, this.PLMConfigNode.plm); break;
				case 'wake': msgOut = await wake(msg, this.PLMConfigNode.plm); break;
				case 'close': msgOut = await close(msg, this.PLMConfigNode.plm); break;

				case 'command': msgOut = await sendCommand(msg, this.PLMConfigNode.plm); break;
				case 'extendedCommand': msgOut = await sendExtendedCommand(msg, this.PLMConfigNode.plm); break;
				case 'groupCommand': msgOut = await sendGroupCommand(msg, this.PLMConfigNode.plm); break;

				case 'startLinking': msgOut = await startLinking(msg, this.PLMConfigNode.plm); break;
				case 'stopLinking': msgOut = await stopLinking(msg, this.PLMConfigNode.plm); break;

				case 'setConfig': msgOut = await setConfig(msg, this.PLMConfigNode.plm); break;
				case 'setCategory': msgOut = await setCategory(msg, this.PLMConfigNode.plm); break;
				case 'setLed': msgOut = await setLed(msg, this.PLMConfigNode.plm); break;
			}

			/* Sending result */
			this.send(msgOut);
		});
	});
};

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
