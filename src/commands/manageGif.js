import * as AdminEditTags from '../channels/adminMsgTypes/editTags.js';
import * as AdminApprove from '../channels/adminMsgTypes/approve.js';
import * as AdminReupload from '../channels/adminMsgTypes/reupload.js';
import * as Dump from '../channels/dump.js';
import * as Database from '../database.js';
import { dump, storage } from '../globals.js';

export async function action(interaction) {
	const gif = Database.getGif(interaction.targetId);
	if (gif) {
		const content = await manage(gif, interaction);
		await interaction.reply({ content, ephemeral: true });
		return;
	}
	const gifs = Database.gifsByDumpMsgUrl[Database.msgIdToUrl[interaction.targetId]];
	await interaction.deferReply({ ephemeral: true });
	if (gifs) {
		let content = '';
		for (const gif of gifs) {
			content += await manage(gif, interaction);
			content += '\n';
		}
		await interaction.editReply({ content, ephemeral: true });
		return;
	}
	const content = 'Command failed; does this message contain a GIF?';
	await interaction.editReply({ content, ephemeral: true });
	return;
}

async function manage(gif) {
	try {
		if (gif.approved) {
			await AdminEditTags.send(gif);
		} else {
			if (!gif.storageUrl) {
				// TODO: it might be also rejected or admin channel.
				const msg = await dump.messages.fetch(gif.dumpMsgId);
				if (gif.reuploadMsgId) await AdminReupload.remove(gif);
				await Dump.reuploadGifsFromMsg(msg);
			} else {
				if (gif.approveMsgId) return 'GIF is already managed';
				await AdminApprove.send(gif);
			}
		}
		return 'Message sent to admin channel.';
	} catch (e) {
		console.log(e);
		return `${e}`;
	}
}
