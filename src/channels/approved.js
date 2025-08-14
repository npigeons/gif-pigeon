import * as Discord from 'discord.js';
import { approved, approvedMP4 } from '../globals.js';
import * as Database from '../database.js';
import * as Utils from '../utils.js';
import * as Events from './events.js';
import * as EmbedView from '../msgTypes/gifEmbedAuthorTagsButtonFav.js';
import * as UrlView from '../msgTypes/gifUrlAuthorTagsButtonFav.js';
import * as GifMsgTypes from '../msgTypes/gifs.js';
import * as Messages from '../messages.js';

export function getDataFromMsg(msg) {
	return { ...GifMsgTypes.getDataFromMsg(msg), approvedMsgId: msg.id };
}

// data: { storageUrl, tags, authorId }

export async function send(gif, tags, force = false) {
	if (gif.approvedMsgId && !force) return;
	if (Utils.isCdnUrl(gif.mainUrl)) return await approved.send(EmbedView.getMessageOptions(gif, Utils.normalizeTags([...tags])));
	else return await approvedMP4.send(UrlView.getMessageOptions(gif, Utils.normalizeTags([...tags, 'mp4'])));
	// events.js will execute "updateTagChannels"
}

export async function addTags(gif, addedTags) {
	const tags = Utils.normalizeTags([...gif.tags, ...addedTags]);
	await replaceTags(gif, tags);
}

export async function refresh(msg) {
	const gif = Database.getGif(msg.id);
	const view = Utils.isCdnUrl(gif.mainUrl) ? EmbedView : UrlView;
	const data = { ...gif };
	const options = view.getMessageOptions(data, gif.tags);
	console.time('edit');
	await msg.edit(options);
	console.timeEnd('edit');
}

export async function replaceTags(gif, newTags) {
	const tags = Utils.normalizeTags(newTags);
	let msgId = gif.approvedMsgId;
	if (Utils.isCdnUrl(gif.mainUrl)) {
		const msg = await approved.messages.fetch(msgId);
		await msg.edit(EmbedView.getMessageOptions(gif, tags));
	} else {
		const msg = await approvedMP4.messages.fetch(msgId);
		await msg.edit(UrlView.getMessageOptions(gif, tags));
	}
}

export async function remove(gif) {
	if (Utils.isCdnUrl(gif.mainUrl)) await Messages.tryToDelete(approved, gif.approvedMsgId);
	else await Messages.tryToDelete(approvedMP4, gif.approvedMsgId);
}

export async function suggestTagsButtonClicked(interaction) {
	const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } = Discord;
	const modal = new ModalBuilder().setCustomId('suggest-tags-modal').setTitle('Suggest tags');
	const tagsInput = new TextInputBuilder()
		.setCustomId('suggest-tags-text-input')
		.setLabel('Comma-separated tags (max 25)')
		.setStyle(TextInputStyle.Short)
		.setPlaceholder('muggers, bernard, horse, epic-npc-man')
		.setMaxLength(2000)
		.setRequired(true);
	modal.addComponents(new ActionRowBuilder().addComponents(tagsInput));
	await interaction.showModal(modal);
}

export async function suggestTagsModalSubmitted(interaction) {
	const gif = Database.getGif(interaction.message.id);
	const existingTags = gif.tags;
	const suggestedTags = interaction.fields
		.getTextInputValue('suggest-tags-text-input')
		.split(',')
		.map(Utils.normalizeTag)
		.filter((s) => s.length && !existingTags.includes(s));
	const uniqueSuggestedTags = [...new Set(suggestedTags)];
	if (uniqueSuggestedTags.length === 0) {
		const content = 'All tags you suggested are already assigned to this GIF!';
		await interaction.reply({ content, ephemeral: true });
		return;
	}
	const content = 'Your tags suggestion has been sent to moderators to approve!';
	await interaction.reply({ content, ephemeral: true });
	await Events.tagsSuggestionSubmitted(gif, uniqueSuggestedTags, interaction.user.id);
}
