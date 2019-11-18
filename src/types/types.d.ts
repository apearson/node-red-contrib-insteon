/* External Types */
import { Node } from 'node-red';
import PLM, { InsteonDevice } from 'insteon-plm';
import { Byte } from 'insteon-packet-parser';

/* Types */
interface InsteonModemConfigNode extends Node {
	path: string;
	errored: boolean;
	plm?: PLM;
}

interface ModemNode extends Node {
	PLMConfigNode: InsteonModemConfigNode;
}

interface SubscribeNode extends Node {
}

interface InsteonDeviceConfigNode extends Node {
	address: Byte[];
	PLMConfigNode: InsteonModemConfigNode;
	device: InsteonDevice;
}
