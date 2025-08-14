import { getDataFromMsg } from '../channels/tagChannels.js';
import { getGif } from '../database.js';
import { syncWarning } from '../channels/logs.js';

const json = JSON.stringify;

export function msgCreated(msg, channel) {
	const data = getDataFromMsg(msg);
	const gif = getGif(data);
	if (gif.tagChannelMsgId[channel.id]) syncWarning(`Duplicate tag msg: ${json(gif)} ${json(data)}`);
	if (!gif.approved) syncWarning(`No approved message for tagged GIF: ${json(data)}`);
	gif.tagChannelMsgId[channel.id] = msg.id;
	gif.registerInDb(data, msg);
}

export function msgDeleted(msg, channel) {
	const data = getDataFromMsg(msg);
	const gif = getGif(data);
	if (!gif || !gif.tagChannelMsgId[channel.id]) {
		syncWarning(`Tag messsage removed, but it wasn't even in the DB: ${json(data)}`);
		return;
	}
	if (!gif.approved) console.log(`No approved message for tagged GIF: ${json(data)}`);
	delete gif.tagChannelMsgId[channel.id];
}
