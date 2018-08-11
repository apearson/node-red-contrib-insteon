/* Importing Libraries and types */
import {Red,Node, NodeProperties} from 'node-red';
import {PLM} from 'insteon-plm';
import {PLMConfigNode} from '../types/types';

/* Interfaces */
interface PLMConfigNodeProps extends NodeProperties{
	path: string;
}

/* Exporting Node Function */
export = function(RED: Red){
	/* Registering node type and a constructor*/
	RED.nodes.registerType('PLMConfig', function(this: PLMConfigNode, props: PLMConfigNodeProps){
		/* Creating actual node */
		RED.nodes.createNode(this, props);

		/* Saving config */
		this.path = props.path;
	});
};