import { Gif, getGif, storageGifs } from '../database.js';
import { getDataFromMsg } from '../channels/storage.js';
import * as Utils from '../utils.js';

export function msgCreated(msg) {
	const data = getDataFromMsg(msg);
	const gif = getGif(data) || new Gif();
	storageGifs.add(gif);
	data.mainUrl = Utils.isTenorOrGiphyUrl(data.dumpUrl) ? data.dumpUrl : data.storageUrl;
	gif.registerInDb(data, msg);
}

export function msgDeleted(msg) {
	const data = getDataFromMsg(msg);
	const gif = getGif(data);
	storageGifs.delete(gif);
}
