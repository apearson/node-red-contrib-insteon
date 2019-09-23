/* Exporting Node Function */
export = function(RED: Red){		
	/* Fired on every deploy */
	// function insteonDevice(this: PLMNode, config: insteonPLMProps){
	function insteonDevice(config){
		/* Creating actual node */
		RED.nodes.createNode(this, config);
		
		/* Turn the address string the user typed into the gui into an array of hex */
		this.address = config.address.toLowerCase().split(".").map(octet => parseInt("0x"+octet,16));
		
		/* State is unknown until we get a packet */
		this.state = {};
		
		/* Clear the status */
		this.status({});

		/* Checking if we don't have a modem */
		if(!config.modem){
			/* Updating status */
			this.status({fill: 'red', shape: 'dot', text: 'No Modem Connected'});

			/* Stopping execution */
			return;
		}

		/* Retrieve the config node */
		this.PLMConfigNode = RED.nodes.getNode(config.modem) as PLMConfigNode;
		
		/* Add this device to the config node's device list so that we can receive packets with the same address */
		this.PLMConfigNode.addDevice(this);
		
		/* Clean up the config node's device list if this node is updated/deleted from the flow */
		this.on('close', function(){
			this.PLMConfigNode.removeDevice(this);
		});
		
		/* Update our state based on the packet received
		   Maybe should be renamed to packetHandler
		*/
		this.updateState = function(packet){
			/* ToDo: Figure out how to interpret packet.type
			   Figure out how to filter packets and interpret the values in order to update user friendly properties of the node
			   e.g. device.on [true|false],
			        device.level [0-100 int],
			        device.motionDetected: [true|false],
			        device.batteryLow: [true|false]
			        etc
			*/
			
			let debugMsg = (packet.cmd1 ? packet.cmd1.toString(16) : "") + ":" + (packet.cmd2 ? packet.cmd2.toString(16) : "");
			this.status({fill: 'green', shape: 'dot', text: debugMsg});
		}
	}


	/* Registering node type and a constructor*/
	RED.nodes.registerType('device', insteonDevice);
};