/* Importing types */
import {Red, Node, NodeProperties} from 'node-red';
import {PLMNode, PLMConfigNode} from '../types/types';

interface insteonPLMProps extends NodeProperties{
	modem: string;
}

/* Exporting Node Function */
export = function(RED: Red){
	/* Registering node type and a constructor*/
	RED.nodes.registerType('insteonPLM', function(this: PLMNode, props: insteonPLMProps){
		/* Creating actual node */
		RED.nodes.createNode(this, props);

		// Retrieve the config node
		this.PLMConfigNode = RED.nodes.getNode(props.modem) as PLMConfigNode;

		/* Setting status */
		this.status({fill: 'blue', shape: 'ring', text: JSON.stringify(this.PLMConfigNode.plm.config)});

		/* On input */
		this.on('input', (msg)=>{
			msg.payload = msg.payload.toUpperCase();
			this.send(msg);
		});
	},
	{
		settings: {
			insteonPLMColor: {
				value: "red",
				exportable: true
			}
		}
	});
};