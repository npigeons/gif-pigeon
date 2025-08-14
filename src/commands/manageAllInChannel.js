import { ChannelType } from 'discord.js';
import { getGif } from '../database.js';
import { getAllChannelMsgs } from '../utils.js';
import * as AdminEditTags from '../channels/adminMsgTypes/editTags.js';

export async function action(interaction) {
	await interaction.reply({
		content: 'Adding all messages from the channel to control-room.',
		ephemeral: true,
	});
	const channel = interaction.options.getChannel('channel');
	const msgs = await getAllChannelMsgs(channel);
	for (const msg of msgs.values()) {
		console.log(msg.id);
		const gif = getGif(msg.id);
		try {
			await AdminEditTags.send(gif);
		} catch (e) {
			console.log(e);
		}
	}
}

export function addOptions(cmd) {
	cmd.addChannelOption((option) =>
		option.setName('channel').setDescription('The channel to manage').addChannelTypes(ChannelType.GuildText).setRequired(true)
	);
}
