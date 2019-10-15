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
				label: el.label,
				cmd1: parseInt(el.cmd1,16),
				cmd2: parseInt(el.cmd2,16)
			}
		});
		
		let subtype = parseInt(config.subtype,16);
		
		/* Retrieve the device config node */
		node.deviceConfigNode = RED.nodes.getNode(config.device);
		
		/* Retrieve the PLM config node */
		node.PLMConfigNode = node.deviceConfigNode.PLMConfigNode;		

		/* Subscribe to the device's events
		   filterPacket to only send the nodes that match the events that the user selected to subscribe to		   
		*/
		const filterPacket = (packet) => {
			let matchedEvent = selectedEvents.filter(el => {
				return el.cmd1 === packet.cmd1
					&&
					(isNaN(el.cmd2)
						|| (el.cmd2 === packet.cmd2)
					)
					&&
					(isNaN(subtype)
						|| (subtype === packet.Flags.subtype)
					)
			});
			
			/* If this device is a dimmer, send a 0x19 status request to get the light's current brightness level so it can be included in the msg
				Device type logic not impelemented yet
			*/

			// if(1){
				// can't await here
			// 	let level = await node.PLMConfigNode.sendCommand(node.deviceConfigNode.address, undefined, 0x19, undefined);
			// }

			if(matchedEvent.length !== 0){
				node.send({
					topic: node.deviceConfigNode.name,
					payload: {
						event: matchedEvent[0].label,
						level: "TBD"
					},
					packet: packet
				});
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

