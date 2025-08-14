import { getDataFromMsg } from '../channels/approved.js';
import { syncWarning } from '../channels/logs.js';
import { approvedGifs, getGif } from '../database.js';
import { approvedMP4 } from '../globals.js';

export function msgCreated(msg) {
	const data = getDataFromMsg(msg);
	const gif = getGif(data);
	data.approved = true;
	if (!gif) {
		syncWarning(`Unknown GIF in Approved: ${JSON.stringify(data)}`);
		return;
	}
	gif.registerInDb(data, msg);
}

export function msgUpdated(oldMsg, newMsg) {
	const data = getDataFromMsg(newMsg);
	const gif = getGif(data);
	gif.tags = data.tags;
}

export function approvedMsgDeleted(msg) {
	const data = getDataFromMsg(msg);
	const gif = getGif(data);
	gif.approved = false;
	gif.tags = [];
	const i = approvedGifs.indexOf(gif);
	approvedGifs.splice(i, 1);
}
