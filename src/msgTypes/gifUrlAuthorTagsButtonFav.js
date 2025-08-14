import * as Utils from '../utils.js';
import * as Discord from 'discord.js';

const FIELDS = [
	{ name: 'mainUrl', variants: [{ prefix: 'URL: ' }] },
	{ name: 'authorMention', variants: [{ prefix: 'Author: ' }] },
	{ name: 'tagsStr', variants: [{ prefix: 'Tags: ' }] },
];
const allowedMentions = { parse: [] };

export function isMsgGeneratedByThisView(msg) {
	let data = Utils.fieldsFromContent(msg.content, FIELDS);
	return data.mainUrl && msg.content.includes('Tags:'); // && msg.components.length === 1 && msg.components[0].components.length === 2;
}

export function getDataFromMsg(msg) {
	let data = Utils.fieldsFromContent(msg.content, FIELDS);
	const mainUrl = data.mainUrl;
	const authorId = data.authorMention ? Utils.getUserIdFromMention(data.authorMention) : null;
	let tagsStr = data.tagsStr;
	const tags = tagsStr.split(', ');
	return { mainUrl, tags, authorId, authorMention: data.authorMention };
}

export function getMessageOptions(gif, tags) {
	const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = Discord;
	const suggestTagsButton = new ButtonBuilder().setCustomId('suggest-tags-button').setLabel('Suggest tags').setStyle(ButtonStyle.Primary);
	const favouritesButton = new ButtonBuilder().setCustomId('add-to-favourites-button').setLabel('Add to favourites').setStyle(ButtonStyle.Success);
	const components = [new ActionRowBuilder().addComponents(favouritesButton, suggestTagsButton)];
	const data = {
		tagsStr: (tags || gif.tags).join(', '),
		...gif,
	};
	const content = Utils.contentFromFields(FIELDS, data);
	return { content, components, allowedMentions };
}
