import * as Discord from 'discord.js';
import * as Database from '../../database.js';
import * as Approved from '../approved.js';
import { admin } from '../../globals.js';
import * as Events from '../events.js';
import * as Utils from '../../utils.js';
import * as Messages from '../../messages.js';
import * as EmbedView from '../../msgTypes/adminEditTagsEmbed.js';
import * as UrlView from '../../msgTypes/adminEditTagsUrl.js';

export async function send(gif) {
	if (gif.editTagsMsgId) throw Error('GIF is already managed.');
	const view = Utils.isCdnUrl(gif.mainUrl) ? EmbedView : UrlView;
	await admin.send(view.getMessageOptions(gif));
}

export async function remove(gif) {
	await Messages.tryToDelete(admin, gif.editTagsMsgId);
}

export async function edit(gif, msgId) {
	if (gif.editTagsMsgId) throw Error('GIF is already managed.');
	const view = Utils.isCdnUrl(gif.mainUrl) ? EmbedView : UrlView;
	const msg = await admin.messages.fetch(msgId);
	await msg.edit(view.getMessageOptions(gif));
}

export async function manageManualTags(interaction) {
	const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = Discord;
	const gif = Database.getGif(interaction.message.id);
	const tags = gif.tags;
	const modal = new ModalBuilder().setCustomId('admin-edit-tags-modal').setTitle('Edit tags');
	const tagsInput = new TextInputBuilder()
		.setCustomId('admin-edit-tags-text-input')
		.setLabel('Comma-separated tags')
		.setStyle(TextInputStyle.Short)
		.setValue(tags.join(', '))
		.setMaxLength(2000) // .setPlaceholder('muggers, bernard, horse')
		.setRequired(true);
	modal.addComponents(new ActionRowBuilder().addComponents(tagsInput));
	await interaction.showModal(modal);
}

export async function submit(interaction) {
	const gif = Database.getGif(interaction.message.id);
	const tags = interaction.fields
		.getTextInputValue('admin-edit-tags-text-input')
		.split(',')
		.map(Utils.normalizeTag);
	await interaction.deferUpdate();
	await Events.gifTagsEdited(gif, tags, interaction.user.id);
	// await Approved.replaceTags(gif, tags);
	// await interaction.message.delete();
}

export async function dontManageManualTags(interaction) {
	await interaction.message.delete();
	await interaction.deferUpdate();
}

export function isMsgGeneratedByThisView(msg) {
	return Utils.isMsgGeneratedByViews(msg, [EmbedView, UrlView]);
}

export function getDataFromMsg(msg) {
	return Utils.getDataFromViews(msg, [EmbedView, UrlView]);
}
