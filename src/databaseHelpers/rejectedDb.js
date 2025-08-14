import { syncWarning } from '../channels/logs.js';
import { getDataFromMsg } from '../channels/rejected.js';
import { getGif, rejectedDumpMsgIds } from '../database.js';

const json = JSON.stringify;

export function msgCreated(msg) {
	const data = getDataFromMsg(msg);
	const gif = getGif(data);
	if (gif) {
		if (gif.dumpMsgId !== data.dumpMsgId) {
			syncWarning(`rejecting msg with wrong assigned gif\n${json(data)}\n${json(gif)}`);
			return;
		}
		data.rejected = true;
		data.rejectedMsgId = msg.id;
		gif.registerInDb(data, msg);
	} else {
		if (data.dumpMsgId) rejectedDumpMsgIds.add(data.dumpMsgId);
		else syncWarning(`rejected message with no useful info: ${msg.url}`);
	}
}
