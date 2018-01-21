/* Importing types */
import {Red,Node, NodeProperties} from 'node-red';

/* Exporting Node Function */
export = function(RED: Red){
	/* Registering node type and a constructor*/
	RED.nodes.registerType('OutletLinc', function(this: Node, props: NodeProperties){
		/* Creating actual node */
		RED.nodes.createNode(this, props);

		/* Setting status */
		this.status({fill: 'blue', shape: 'ring', text: 'OutletLinc'});

		/* On input */
		this.on('input', (msg)=>{
			msg.payload = msg.payload.toUpperCase();
			this.send(msg);
		});
	});
};