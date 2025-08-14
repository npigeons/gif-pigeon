import { getGif } from '../database.js';
import { getDataFromMsg } from '../channels/personalChannels.js';
import { client } from '../globals.js';
import { syncWarning } from '../channels/logs.js';

const json = JSON.stringify;

export function msgCreated(msg, channel) {
	if (msg.author.id !== client.user.id) return;
	const data = getDataFromMsg(msg);
	const gif = getGif(data);
	if (gif.personalChannelMsgId[channel.id]) syncWarning(`Duplicate personal msg: ${json(gif)} ${json(data)}`);
	gif.personalChannelMsgId[channel.id] = msg.id;
	delete data.tags; // Just in case, don't overwrite tags from #gif-library.
	gif.registerInDb(data, msg);
}

export function msgDeleted(msg, channel) {
	if (msg.author.id !== client.user.id) return;
	const data = getDataFromMsg(msg);
	const gif = getGif(data);
	if (!gif.personalChannelMsgId[channel.id]) syncWarning('deleted personal channel msg not in DB');
	delete gif.personalChannelMsgId[channel.id];
}
