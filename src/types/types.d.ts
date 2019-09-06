/* External Types */
import { Node } from 'node-red';
import PLM from 'insteon-plm';

/* Types */
interface PLMConfigNode extends Node{
	path: string;
	errored: boolean;
	plm?: PLM;
}

interface PLMNode extends Node{
	PLMConfigNode: PLMConfigNode;
}