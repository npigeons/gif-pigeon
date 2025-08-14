import * as Discord from 'discord.js';
import * as Database from '../../database.js';
import * as Utils from '../../utils.js';
import { admin, channels } from '../../globals.js';
import * as Approved from '../approved.js';
import * as EditTags from './editTags.js';
import * as Globals from '../../globals.js';
import * as Rejected from '../rejected.js';
import * as Events from '../events.js';
import * as Logs from '../logs.js';
import * as Messages from '../../messages.js';
import * as EmbedView from '../../msgTypes/adminApproveEmbed.js';
import * as UrlView from '../../msgTypes/adminApproveUrl.js';

/* data: { isApproveMsg: true, storageUrl, categories: [{id, name, channels: [{ id, name, chosen }]}] */

export async function remove(gif) {
	await Messages.tryToDelete(admin, gif.approveMsgId);
}

export async function send(gif) {
	const data = {
		...gif,
		categories: getDefaultCategoriesData(gif.dumpTagsSuggestion),
	};
	await createOrEditMessage(data, null);
}

async function createOrEditMessage(data, msg) {
	const gif = Database.getGif(data);
	data = { ...gif, ...data };

	let options;
	if (Utils.isCdnUrl(gif.mainUrl)) options = EmbedView.getMessageOptions(data);
	else options = UrlView.getMessageOptions(data);

	if (msg) await msg.edit(options);
	else if (!gif.approveMsgId) await admin.send(options);
}

export function isMsgGeneratedByThisView(msg) {
	return Utils.isMsgGeneratedByViews(msg, [EmbedView, UrlView]);
}

export function getDataFromMsg(msg) {
	return Utils.getDataFromViews(msg, [EmbedView, UrlView]);
}

export async function confirm(interaction) {
	const gif = Database.getGif(interaction.message.id);
	const data = getDataFromMsg(interaction.message);
	await interaction.deferUpdate();
	await Events.gifApproved(gif, data.chosenTags, interaction.user.id);
	// await interaction.message.edit({
	// 	content: MORE_TAGS_MSG,
	// 	components: EditTags.getManualTagsComponents(),
	// });
}

export async function reject(interaction) {
	const gif = Database.getGif(interaction.message.id);
	await interaction.deferUpdate();
	await Events.gifRejected(gif);
}

export async function categoryChannelsChosen(interaction) {
	// Last character of customId is 0, 1, 2 or 3 - which select menu has been interacted with.
	const categoryIndex = Number(interaction.customId.slice(-1));
	const chosenChannels = [...interaction.values];
	const data = getDataFromMsg(interaction.message);
	const categoryData = data.categories[categoryIndex];
	for (const channelData of categoryData.channels) channelData.chosen = chosenChannels.includes(channelData.id);
	await createOrEditMessage(data, interaction.message);
	await interaction.deferUpdate();
}

function getDefaultCategoriesData(dumpTags) {
	if (!dumpTags) dumpTags = [];
	const tagChannels = [...Utils.getTagChannels().values()];
	const categoryIds = [...new Set(tagChannels.map((c) => c.parent?.id))].filter((c) => c);
	const categories = categoryIds.map((cid) => channels.get(cid));
	const categoriesData = [];
	if (categories.length > 4) {
		Logs.syncWarning('Too many GIF categories: can display only four select menus.');
		categories.length = 4;
	}
	for (const category of categories) {
		const channels = tagChannels.filter((c) => c.parent?.id === category.id);
		if (channels.length > 25) {
			Logs.syncWarning('Too many channels in one category; can display only 25 options.');
			channels.length = 25;
		}
		channels.sort((x, y) => x.position - y.position);
		const categoryData = { id: category.id, name: category.name };
		const getTag = (c) => Utils.getTagChannelExpr(c).replaceAll("'", '').split(' ')[0];
		categoryData.channels = channels.map((c) => ({
			id: c.id,
			name: getTag(c),
			chosen: dumpTags.includes(getTag(c)),
		}));
		categoriesData.push(categoryData);
	}
	return categoriesData;
}
