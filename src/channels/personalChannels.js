import * as GifMsgTypes from '../msgTypes/gifs.js';
import * as Utils from '../utils.js';
import * as EmbedView from '../msgTypes/gifEmbedAuthorTagsButtonUnfav.js';
import * as UrlView from '../msgTypes/gifUrlAuthorTagsButtonUnfav.js';
import * as Messages from '../messages.js';
import { getGif } from '../database.js';

export const getDataFromMsg = GifMsgTypes.getDataFromMsg;

function getOptions(gif) {
	const view = Utils.isCdnUrl(gif.mainUrl) ? EmbedView : UrlView;
	return view.getMessageOptions(gif);
}

export async function send(gif, channel) {
	await channel.send(getOptions(gif));
}

export async function update(gif) {
	const channels = Utils.getPersonalChannels().values();
	for (const channel of channels) await updateChannel(gif, channel);
}

export async function updateChannel(gif, channel) {
	const view = Utils.isCdnUrl(gif.mainUrl) ? EmbedView : UrlView;
	const options = view.getMessageOptions(gif);
	let msgId = gif.personalChannelMsgId[channel.id];
	if (!msgId) return;
	const msg = await channel.messages.fetch(msgId);
	await msg.edit(options);
}

export async function refresh(msg) {
	const data = getDataFromMsg(msg);
	const gif = getGif(data);
	if (!gif) console.log(msg.url);
	await msg.edit(getOptions(gif));
}

export async function remove(gif) {
	const channels = Utils.getPersonalChannels().values();
	for (const channel of channels) await removeGifFromChannel(gif, channel);
}

async function removeGifFromChannel(gif, channel) {
	const msgId = gif.personalChannelMsgId[channel.id];
	await Messages.tryToDelete(channel, msgId);
}

export async function removeButtonClicked(interaction) {
	await interaction.deferUpdate();
	const msg = interaction.message;
	const data = getDataFromMsg(msg);
	const gif = getGif(data);
	await removeGifFromChannel(gif, msg.channel);
}
