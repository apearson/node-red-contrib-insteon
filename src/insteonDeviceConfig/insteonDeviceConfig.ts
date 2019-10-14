/*
The purpose of this deviceConfig node is to represent a physical insteon device and allow the user to:
- Give the device a friendly name
- Know what the basic device type is (dimmer switch, on/off switch, motion sensor, i/o linc, etc)
- Set the device preferences (e.g. on level, ramp rate)
- Manage the devices link database

Internally the node will also track the devices real world state and emit events when those states change
*/

/* Exporting Node Function */
export = function(RED: Red){		
	/* Fired on every deploy */
	// function insteonDevice(this: PLMNode, config: insteonPLMProps){
	function insteonDeviceConfig(config){
		/* Creating actual node */
		RED.nodes.createNode(this, config);
		
		let node = this;
		
		/* Turn the address string the user typed into the gui into an array of hex */
		node.address = config.address.toUpperCase().split(".").map(oct => parseInt("0x"+oct,16)); 
		
		if(!Array.isArray(node.address)){
			/* Stopping */
			return;
		}
		
		/* To subscribe to PLM events, we need the address back in string form. Doing it this way eliminates problems with case insentitivy and leading zeros */
		node.stringAddress = node.address.map(num => num.toString(16).toUpperCase()).join('.');
				
		/* Checking if we don't have a modem */
		if(!config.modem){
			/* Stopping execution */
			return;
		}

		/* Retrieve the PLMConfigNode */
		node.PLMConfigNode = RED.nodes.getNode(config.modem) as PLMConfigNode;

		// /* Send a product data request message to the device to find out what it is */
		// getDeviceInfo(node.PLMConfigNode.plm).then(res,err){
		// 	console.log("res:",res);
		// };

		// let deviceInfo = await node.PLMConfigNode.plm.sendStandardCommand(node.address,0x00,0x03,0x00);
		// console.log(deviceInfo);
		// deviceTypes.filter()
		
		/* subscribe to packets addressed from the device */
		// node.PLMConfigNode.plm.on(["**",node.stringAddress], function(packet){
		// 	node.warn(`got packet from ${node.stringAddress}`);
		// 	node.warn(packet);
		// });
	}

	/* Registering node type and a constructor */
	RED.nodes.registerType('insteon-device-config', insteonDeviceConfig);	
};



//
// async function firstAsync() {
//     let promise = new Promise((res, rej) => {
//         setTimeout(() => res("Now it's done!"), 1000)
//     });
//
//     // wait until the promise returns us a value
//     let result = await promise;
//
//     // "Now it's done!"
//     alert(result);
// }
//
//
// async function getDeviceInfo(plm: PLM){
// 	let info = await plm.getInfo();
//
// 	/* Returning info */
// 	return info;
// }
