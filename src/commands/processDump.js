import * as Utils from '../utils.js';
import * as Dump from '../channels/dump.js';
import { dump } from '../globals.js';

export async function action(interaction) {
	await interaction.reply({
		content: 'Started processing gif-dump messages; this might take a while.',
		ephemeral: true,
	});
	const maxCount = interaction.options.getInteger('max_msg');
	const dumpMessages = await Utils.getAllChannelMsgs(dump);
	let count = 0;
	if (count >= maxCount) return;
	for (const msg of dumpMessages.values()) {
		count += await Dump.reuploadGifsFromMsg(msg);
		if (count >= maxCount) break;
	}
}

export function addOptions(cmd) {
	cmd.addIntegerOption((option) =>
		option
			.setName('max_msg')
			.setDescription('Maximum number of re-uploaded GIFs')
			.setRequired(true)
	);
}
