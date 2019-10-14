/* Exporting Node Function */
export = function(RED: Red){		
	/* Fired on every deploy */
	function insteonSubscribe(config){
		/* Creating actual node */
		RED.nodes.createNode(this, config);
		
		let node = this;
		
		/* Clear the status */
		node.status({});

		/* Checking if we don't have a device */
		if(!config.device){
			/* Updating status */
			node.status({fill: 'red', shape: 'dot', text: 'No Device Selected'});

			/* Stopping execution */
			return;
		}
		
		/* See which events the user subscribed to */
		let selectedEvents = config.selectedEvents.map(el => {
			return {
				cmd1: parseInt(el.cmd1,16),
				// cmd2: parseInt(el.cmd2,16)
			}
		});
		
		/* Retrieve the device config node */
		node.deviceConfigNode = RED.nodes.getNode(config.device);
		
		/* Retrieve the PLM config node */
		node.PLMConfigNode = node.deviceConfigNode.PLMConfigNode;		

		/* Subscribe to the device's events
		   filterPacket to only send the nodes that match the events that the user selected to subscribe to		   
		*/
		const filterPacket = (packet) => {
			if(selectedEvents.filter(el => el.cmd1 === packet.cmd1).length !== 0){
				node.send({payload: packet});
			}
		};

		/* Add the event listener */
		node.PLMConfigNode.plm.on(["**",node.deviceConfigNode.stringAddress], filterPacket);

		/* Remove the event listener whenever the user modifies the node config or deletes the node */
		node.on('close', function(removed,done){
			node.PLMConfigNode.plm.removeListener(["**",node.deviceConfigNode.stringAddress],filterPacket);
			done();
		});
		
	}


	/* Registering node type and a constructor*/
	RED.nodes.registerType('subscribe', insteonSubscribe);
};

