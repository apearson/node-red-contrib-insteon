/* External Types */
import { Node } from 'node-red';
import PLM, { InsteonDevice } from 'insteon-plm';
import { Byte } from 'insteon-packet-parser';

/* Types */
interface PLMConfigNode extends Node {
	path: string;
	errored: boolean;
	plm?: PLM;
}

interface PLMNode extends Node {
	PLMConfigNode: PLMConfigNode;
}

interface SubscribeNode extends Node {
}

interface insteonDeviceConfigNode extends Node {
	address: Byte[];
	PLMConfigNode: PLMConfigNode;
	device: InsteonDevice;
}
