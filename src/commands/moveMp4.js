import { remove, send } from '../channels/approved.js';
import * as Database from '../database.js';
import { approved, approvedMP4 } from '../globals.js';
import * as Utils from '../utils.js';
import * as Messages from '../messages.js';

export async function action(interaction) {
	await interaction.reply({ content: 'Moving all MP4 links to mp4-channel...', ephemeral: true });
	for (const gif of Database.approvedGifs) {
		if (!Utils.isCdnUrl(gif.mainUrl)) {
			// console.log(gif.mainUrl);
			await send(gif, gif.tags, /*force=*/ true);
			await Messages.tryToDelete(approved, gif.approvedMsgId);
		}
	}
}
