import { admin, dump } from '../../globals.js';
import * as Database from '../../database.js';
import * as Utils from '../../utils.js';
import * as Events from '../events.js';
import * as Discord from 'discord.js';
import * as Messages from '../../messages.js';

// data: { isNoGifWarning: true, dumpMsgId, dumpMsgUrl }

const FIELDS = [
	{
		name: 'dumpMsgUrl',
		variants: [{ prefix: 'No GIFs found in ', suffix: ' - is it the case?' }],
	},
];

export async function send(dumpMsg) {
	if (Database.noGifWarning[dumpMsg.url]) return;
	const content = Utils.contentFromFields(FIELDS, { dumpMsgUrl: dumpMsg.url });
	const components = getComponents();
	await admin.send({ content, embeds: [], components });
}

export async function remove(dumpMsgUrl) {
	const warningMsgId = Database.noGifWarning[dumpMsgUrl];
	await Messages.tryToDelete(admin, warningMsgId);
}

export async function confirm(interaction) {
	const data = getDataFromMsg(interaction.message);
	await Events.acknowledgeNoGifWarning(data.dumpMsgUrl);
}

export function isMsgGeneratedByThisView(msg) {
	const data = Utils.fieldsFromContent(msg.content, FIELDS);
	return data.dumpMsgUrl;
}

export function getDataFromMsg(warningMsg) {
	const data = Utils.fieldsFromContent(warningMsg.content, FIELDS);
	data.dumpMsgId = Utils.getMsgIdFromUrl(data.dumpMsgUrl);
	data.noGifWarningMsgId = warningMsg.id;
	return { isNoGifWarning: true, ...data };
}

function getComponents() {
	const { ButtonBuilder, ActionRowBuilder, ButtonStyle } = Discord;
	const button = new ButtonBuilder()
		.setCustomId('admin-no-gif-warning-confirm')
		.setLabel('Confirm')
		.setStyle(ButtonStyle.Primary);
	const row = new ActionRowBuilder().addComponents(button);
	return [row];
}
