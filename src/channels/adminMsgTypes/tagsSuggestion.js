import { admin } from '../../globals.js';
import * as Logs from '../logs.js';
import * as Discord from 'discord.js';
import * as Database from '../../database.js';
import * as Events from '../events.js';
import * as Utils from '../../utils.js';
import * as Messages from '../../messages.js';

// data: {isTagProposition: true, storageUrl, tagsAuthorId, tagsData: [{ tag, chosen }]}

const FIELDS = [
	{ name: 'mainUrl', variants: [{ prefix: 'URL: ' }] },
	{ name: 'tagsAuthorId', variants: [{ prefix: 'Review tags added by <@', suffix: '>' }] },
];

export async function removeAll(gif) {
	for (const ts of gif.tagsSuggestions) {
		await Messages.tryToDelete(admin, ts.msgId);
	}
}

export async function send(gif, tags, tagsAuthorId) {
	if (tags.length > 25) {
		Logs.syncWarning('More than 25 tags were suggested; ignoring the rest.');
		tags.length = 25;
	}
	const data = {
		...gif,
		isTagProposition: true,
		tagsData: tags.map((tag) => ({ tag, chosen: true })),
		tagsAuthorId,
	};
	await sendOrEdit(data);
}

export async function sendDumpSuggestions(gif) {
	const presentedTags = [];
	for (const categoryData of gif.categories) {
		for (const channelData of categoryData.channels) presentedTags.push(channelData.name);
	}
	const remainingDumpTags = gif.dumpTagsSuggestion.filter((tag) => !presentedTags.includes(tag));
	if (remainingDumpTags.length) await send(gif, remainingDumpTags);
}

const allowedMentions = { parse: [] };
async function sendOrEdit(data, msg) {
	const gif = Database.getGif(data);
	data = { ...gif, ...data };
	let content, embeds, components;
	if (Utils.isCdnUrl(data.mainUrl)) {
		content = Utils.contentFromFields(FIELDS, { ...data, mainUrl: null });
		embeds = [new Discord.EmbedBuilder().setImage(data.storageUrl)];
		components = getComponents(data);
	} else {
		content = Utils.contentFromFields(FIELDS, data);
		embeds = [];
		components = getComponents(data);
	}
	if (msg) await msg.edit({ content, components, embeds, allowedMentions });
	else await admin.send({ content, components, embeds, allowedMentions });
}

export function getDataFromMsg(msg) {
	const data = Utils.fieldsFromContent(msg.content, FIELDS);
	if (!data.mainUrl) data.mainUrl = msg.embeds[0].data.image.url;
	data.isTagProposition = true;
	data.msgId = msg.id;

	const row = msg.components[0];
	const select = row.components[0];
	data.tagsData = select.options.map((o) => ({ tag: o.value, chosen: o.default }));
	return data;
}

export function isMsgGeneratedByThisView(msg) {
	// const data = Utils.fieldsFromContent(msg.content, FIELDS);
	try {
		return msg.components[0].components[0].customId === 'admin-tag-suggestion-select';
	} catch (e) {
		return false;
	}
}

export async function remove(data) {
	await Messages.tryToDelete(admin, data.msgId);
}

export async function select(interaction) {
	const data = getDataFromMsg(interaction.message);
	const selectedTags = [...interaction.values];
	for (const tagData of data.tagsData) tagData.chosen = selectedTags.includes(tagData.tag);
	await sendOrEdit(data, interaction.message);
	await interaction.deferUpdate();
}

export async function confirm(interaction) {
	const data = getDataFromMsg(interaction.message);
	const gif = Database.getGif(interaction.message.id);
	const selectedTags = data.tagsData.filter((td) => td.chosen).map((td) => td.tag);
	await interaction.deferUpdate();
	await Events.tagsSuggestionApproved(gif, data, selectedTags, interaction.user.id);
}

export async function reject(interaction) {
	const data = getDataFromMsg(interaction.message);
	await interaction.deferUpdate();
	await Events.tagsSuggestionRejected(data);
	// interaction.message.delete();
}

function getComponents(data) {
	const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = Discord;
	const { ButtonBuilder, ButtonStyle } = Discord;

	const components = [];

	const select = new StringSelectMenuBuilder().setCustomId(`admin-tag-suggestion-select`).setMinValues(0).setMaxValues(data.tagsData.length);
	for (const tagData of data.tagsData) {
		const option = new StringSelectMenuOptionBuilder().setLabel(tagData.tag).setValue(tagData.tag).setDefault(tagData.chosen);
		select.addOptions(option);
	}
	components.push(new ActionRowBuilder().addComponents(select));

	const confirm = new ButtonBuilder().setCustomId('admin-tag-suggestion-confirm').setLabel('Confirm').setStyle(ButtonStyle.Success);
	const reject = new ButtonBuilder().setCustomId('admin-tag-suggestion-reject').setLabel('Reject').setStyle(ButtonStyle.Danger);
	components.push(new ActionRowBuilder().addComponents(confirm, reject));

	return components;
}
