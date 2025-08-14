import * as Discord from 'discord.js';
import * as Database from '../../database.js';
import * as Dump from '../dump.js';
import * as Utils from '../../utils.js';
import { admin, dump } from '../../globals.js';
import * as Logs from '../logs.js';
import * as Messages from '../../messages.js';

// data: { isReuploadMsg: true, dumpUrl, dumpMsgUrl, dumpMsgId }

const FAILED_MSG = 'Failed to re-upload a GIF.';
const FIELDS = [
	{ name: '', variants: [{ prefix: FAILED_MSG }] },
	{ name: 'dumpMsgUrl', variants: [{ prefix: 'Original message: ' }] },
	{ name: 'dumpUrl', variants: [{ prefix: 'Original URL: ' }] },
];
export async function send(gif) {
	// if (gif.reuploadMsgId) throw Error(`Reupload message already present: ${JSON.stringify(gif)}`);
	if (!gif.dumpUrl || !gif.dumpMsgUrl)
		throw Error(`Sending reupload msg failed; does dump msg exist? ${JSON.stringify(gif)}`);
	const content = Utils.contentFromFields(FIELDS, gif);
	await admin.send({ content, components: getReuploadComponents() });
}

export async function remove(gif) {
	await Messages.tryToDelete(admin, gif.reuploadMsgId);
}

function getReuploadComponents() {
	const { ButtonBuilder, ActionRowBuilder, ButtonStyle } = Discord;
	const button = new ButtonBuilder()
		.setCustomId('admin-reupload')
		.setLabel('Try re-uploading again')
		.setStyle(ButtonStyle.Primary);
	const reject = new ButtonBuilder()
		.setCustomId('admin-manage-reject')
		.setLabel('Reject')
		.setStyle(ButtonStyle.Danger);
	const row = new ActionRowBuilder().addComponents(button, reject);
	return [row];
}

export async function tryReuploadingAgain(interaction) {
	const gif = Database.getGif(interaction.message.id);
	let dumpMsg;
	try {
		const dumpMsgId = gif.dumpMsgId;
		dumpMsg = await dump.messages.fetch(dumpMsgId);
	} catch (e) {
		const content = 'It seems the original message has been deleted; ignoring.';
		await interaction.reply({ content, ephemeral: true });
		await interaction.message.delete();
		return;
	}
	await interaction.reply({ content: 'Trying to re-upload again.', ephemeral: true });
	await Dump.reuploadGif(gif);
	// await interaction.message.delete();
}

export function isMsgGeneratedByThisView(msg) {
	// const data = Utils.fieldsFromContent(msg.content, FIELDS);
	return msg.content.startsWith(FAILED_MSG); // data.dumpUrl && data.dumpMsgUrl;
}

export function getDataFromMsg(msg) {
	const data = Utils.fieldsFromContent(msg.content, FIELDS);
	data.dumpMsgId = Utils.getMsgIdFromUrl(data.dumpMsgUrl);
	data.reuploadMsgId = msg.id;
	return { isReuploadMsg: true, ...data };
}
