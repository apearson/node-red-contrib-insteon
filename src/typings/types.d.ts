/* External Types */
import { Node } from 'node-red';
import PLM, { InsteonDevice } from 'insteon-plm';
import { Byte } from 'insteon-packet-parser';

//#region Config Nodes

interface InsteonModemConfigNode extends Node {
	path: string;
	errored: boolean;
	plm?: PLM;
}
interface InsteonDeviceConfigNode extends Node {
	address: Byte[];
	PLMConfigNode?: InsteonModemConfigNode;
	device?: InsteonDevice | null;
	deviceType: string;
}

interface InsteonSceneConfigNode extends Node {
	scene?: number;
	PLMConfigNode?: InsteonModemConfigNode;
}

//#endregion

//#region Flow Nodes

interface ModemNode extends Node {
	PLMConfigNode: InsteonModemConfigNode;
}

interface SceneSubscribeNode extends Node {
	sceneConfigNode?: InsteonSceneConfigNode;
}

interface SceneCommandNode extends Node {
	sceneConfigNode?: InsteonSceneConfigNode;
}

interface DeviceCommandNode extends Node {
	deviceConfigNode?: InsteonDeviceConfigNode;
	command: string;
	onLevel: Byte;
	onRamp: Byte;
}

interface DeviceRequestNode extends Node {
	deviceConfigNode?: InsteonDeviceConfigNode;
	command: string;
	onLevel: Byte;
	onRamp: Byte;
}

//#endregion
