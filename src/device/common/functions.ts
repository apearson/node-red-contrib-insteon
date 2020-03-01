import { DeviceRequestNode, DeviceCommandNode } from "../../types/types";
import { Byte } from "insteon-plm";

//#region Command Functions

export async function toggle(node: DeviceRequestNode | DeviceCommandNode, device: any, msg: any){

	// Grabbing status from msg payload
	const status: string = msg?.payload?.status;
	const fast: boolean  = msg?.payload?.fast ?? false;
	const level: Byte    = msg?.payload?.level ?? 0xFF;

	// Checking status for correct format
	if(status === undefined || (status !== 'off' && status !== 'on' && status != 'instant')){
		node.error('Payload or Status in incorrect format');
		return;
	}

	// Executing command
	if(status == 'on')
		return fast ? device.LightOnFast() : device.LightOn(level);
	else if(status == 'off')
		return fast ? device.LightOffFast() : device.LightOff();
	else if(status == 'instant')
		return device.InstantOnOff(level)
	else
		node.error('Payload or Status in incorrect format');
}

export async function dim(node: DeviceRequestNode | DeviceCommandNode, device: any, msg: any){

	// Grabbing info from msg payload
	const direction: string = msg?.payload?.dim;
	const continuous: boolean = msg?.payload?.continuous;

	// Checking status for correct format
	if(direction === undefined || (direction !== 'up' && direction !== 'down' && direction !== 'stop')){
		node.error('Payload or Status in incorrect format');
		return;
	}

	// Executing command
	if(direction == 'up')
		return continuous ? device.BeginBrightening() : device.BrightenOneStep();
	else if(direction == 'down')
		return continuous ? device.BeginDimming() : device.DimOneStep();
	else if(direction == 'stop')
		return device.StopChanging()
	else
		node.error('Payload or Status in incorrect format');
}

//#endregion