/* Importing types */
import {Red, Node, NodeProperties} from 'node-red';
import {PLMNode, PLMConfigNode} from '../types/types';

interface insteonPLMProps extends NodeProperties{
	modem: string;
}

/* Exporting Node Function */
export = function(RED: Red){
	/* Registering node type and a constructor*/
	RED.nodes.registerType('insteonEvents', function(this: PLMNode, props: insteonPLMProps){
		/* Creating actual node */
		RED.nodes.createNode(this, props);

		// Retrieve the config node
		this.PLMConfigNode = RED.nodes.getNode(props.modem) as PLMConfigNode;
	});
};
