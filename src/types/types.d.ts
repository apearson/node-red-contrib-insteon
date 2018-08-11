/* External Types */
import { Node } from 'node-red';
import { PLM } from 'insteon-plm';

/* Types */
interface PLMConfigNode extends Node{
	path: string;
}

interface PLMNode extends Node{
	PLMConfigNode?: PLMConfigNode;
	plm: PLM;
	reconnectTime: number;
}