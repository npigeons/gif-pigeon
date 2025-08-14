import { getDataFromMsg } from '../channels/dump.js';
import { syncWarning } from '../channels/logs.js';
import { Gif, getGif } from '../database.js';

export function msgCreated(msg) {
	const gifsData = getDataFromMsg(msg);
	for (const gifData of gifsData) {
		const gif = getGif(gifData) || new Gif();
		if (gif.dumpUrl && !gif.storageUrl) return syncWarning('Dump msg registered twice?');
		if (gif.authorId && gif.authorId !== gifData.authorId) {
			delete gifData.authorId;
			delete gifData.authorMention;
		}
		gif.registerInDb(gifData);
	}
}
