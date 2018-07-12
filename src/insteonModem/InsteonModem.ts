/* Importing types */
import {Red,Node, NodeProperties} from 'node-red';

/* Exporting Node Function */
export = function(RED: Red){
	/* Registering node type and a constructor*/
	RED.nodes.registerType('insteonModem', function(this: Node, props: NodeProperties){
		/* Creating actual node */
		RED.nodes.createNode(this, props);
	});
};