import { Red, NodeProperties } from 'node-red';
import PLM, { Packet } from 'insteon-plm';
import { SubscribeNode } from '../types/types';

interface eventSelection {
    label: string;
    cmd1: number;
	cmd2: number;
}

interface SubscribeConfigNodeProps extends NodeProperties{
	device: string;
	selectedEvents: string[];
	subtype: string;
}


/* Exporting Node Function */
export = function(RED: Red){		
	/* Fired on every deploy */
	/* Registering node type and a constructor */
	RED.nodes.registerType('subscribe', function(this: SubscribeNode, config: SubscribeConfigNodeProps){		
		/* Creating actual node */
		RED.nodes.createNode(this, config);
		
		let node = this as any;
		
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
		let selectedEvents = config.selectedEvents.map((el: any) => {
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
		const filterPacket = async (packet: Packet.Packet) => {
			// console.log('filter packet', packet);
			
			let matchedEvent = selectedEvents.filter((el: eventSelection) => {
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

			if(matchedEvent.length !== 0){
				if(1){
					// console.log('awaiting level');
					//  // can't await here
					// let level = await node.PLMConfigNode.plm.sendStandardCommand(node.deviceConfigNode.address, undefined, 0x19, undefined);
					// console.log('done awaiting');
					// console.log("level",level);
				
				
				
				node.send({
					topic: node.deviceConfigNode.name,
					payload: {
						event: matchedEvent[0].label,
						// level: level
					},
					packet: packet
				});
				
				}
			}else{
				// node.send({topic: "no match", packet: packet});
			}
		};

		/* Add the event listener */
		node.PLMConfigNode.plm.on(["**",node.deviceConfigNode.stringAddress], filterPacket);

		/* Remove the event listener whenever the user modifies the node config or deletes the node */
		node.on('close', function(removed: boolean, done: () => void){
			node.PLMConfigNode.plm.removeListener(["**",node.deviceConfigNode.stringAddress],filterPacket);
			done();
		});	
	});
};

