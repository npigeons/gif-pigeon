import * as GifMsgTypes from '../msgTypes/gifs.js';
import * as Utils from '../utils.js';
import * as GifBareViewFavourites from '../msgTypes/gifBareFavourites.js';
import * as Messages from '../messages.js';
import * as Database from '../database.js';

export const getDataFromMsg = GifMsgTypes.getDataFromMsg;

export async function update(gif) {
	// if (!Utils.isCdnUrl(gif.mainUrl)) return;
	const channels = Utils.getTagChannels().values();
	const toDelete = [];
	for (const channel of channels) {
		const tagExpr = Utils.getTagChannelExpr(channel);
		const sat = Utils.satisfiesTagExpr(gif, tagExpr);
		if (sat) await sendOrUpdateChannelMsg(gif, channel);
		else toDelete.push(channel);
	}
	for (const channel of toDelete) await removeGifFromChannel(gif, channel);
}

export async function sendOrUpdateChannelMsg(gif, channel) {
	// if (!Utils.isCdnUrl(gif.mainUrl)) return;
	let msgId = gif.tagChannelMsgId[channel.id];
	if (!msgId) await channel.send(GifBareViewFavourites.getMessageOptions(gif));
}

export async function refresh(msg) {
	const gif = Database.getGif(msg.id);
	const options = GifBareViewFavourites.getMessageOptions(gif);
	console.time('tagRefresh');
	await msg.edit(options);
	console.timeEnd('tagRefresh');
}

async function removeGifFromChannel(gif, channel) {
	await Messages.tryToDelete(channel, gif.tagChannelMsgId[channel.id]);
}

export async function remove(gif) {
	const channels = Utils.getTagChannels().values();
	for (const channel of channels) await removeGifFromChannel(gif, channel);
}
