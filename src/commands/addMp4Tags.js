import { addTags } from '../channels/approved.js';
import * as Database from '../database.js';
import { approved, approvedMP4 } from '../globals.js';
import * as Utils from '../utils.js';
import * as Messages from '../messages.js';

export async function action(interaction) {
	await interaction.reply({ content: 'Adding "mp4" tag to all MP4s...', ephemeral: true });
    let cnt = 0;
	for (const gif of Database.approvedGifs) {
		if (!Utils.isCdnUrl(gif.mainUrl)) {
            cnt += 1;
            // if (cnt > 5) break;
			console.log(gif.mainUrl);
            addTags(gif, ['mp4']);
		}
	}
}
