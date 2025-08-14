import * as Utils from '../utils.js';
import * as Discord from 'discord.js';

const FIELDS = [
	{ name: 'authorMention', variants: [{ prefix: 'Author: ' }] },
	{ name: 'tagsStr', variants: [{ prefix: 'Tags: ' }] },
];
const allowedMentions = { parse: [] };

// export function isMsgGeneratedByThisView(msg) {
// 	// let data = Utils.fieldsFromContent(msg.content, FIELDS);
// 	return msg.embeds.length === 1 && msg.embeds[0].data.image && msg.components.length === 1 && msg.components[0].components.length === 2;
// }

export function getDataFromMsg(msg) {
	let data = Utils.fieldsFromContent(msg.content, FIELDS);
	const mainUrl = msg.embeds[0].data.image.url;
	const authorId = data.authorMention ? Utils.getUserIdFromMention(data.authorMention) : null;
	const tags = data.tagsStr.split(', ');
	return { mainUrl, tags, authorId, authorMention: data.authorMention };
}

export function getMessageOptions(gif, tags) {
	const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } = Discord;
	const suggestTagsButton = new ButtonBuilder().setCustomId('suggest-tags-button').setLabel('Suggest tags').setStyle(ButtonStyle.Primary);
	const favouritesButton = new ButtonBuilder().setCustomId('remove-from-favourites-button').setLabel('Remove from favourites').setStyle(ButtonStyle.Danger);
	const components = [new ActionRowBuilder().addComponents(favouritesButton, suggestTagsButton)];
	const embeds = [new EmbedBuilder().setImage(gif.mainUrl)];
	const data = {
		authorMention: gif.authorMention,
		tagsStr: (tags || gif.tags).join(', '),
	};
	const content = Utils.contentFromFields(FIELDS, data);
	return {
		content,
		components,
		embeds,
		allowedMentions,
	};
}
