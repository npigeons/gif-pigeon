import { logs, channels } from '../globals.js';
import { getAllChannelMsgs, getOldGifCategories } from '../utils.js';

export async function action(interaction) {
	await interaction.reply({
		content: 'Backup started! It might take a while.',
		ephemeral: true,
	});
	const data = {
		categories: getOldGifCategories(),
		channels: [...channels.values()],
		messages: [],
		attachments: [],
	};
	// for (const category of client.pigeonhole.gifCategories.values()) {
	//     const channels = client.pigeonhole.categoryChannels.get(
	//         category.id
	//     );
	//     for (const channel of channels.values())
	//         data.channels.push(channel);
	// }
	for (const channel of data.channels) {
		console.log(channel.name, channel.type);
		if (channel.type !== 0) continue;
		let messages;
		try {
			messages = await getAllChannelMsgs(channel);
		} catch (e) {
			console.log(e);
			continue;
		}
		for (const msg of messages.values()) {
			data.messages.push(msg);
			for (const att of msg.attachments.values()) data.attachments.push(att);
		}
	}
	await logs.send({
		content: 'Created backup.',
		files: [
			{
				attachment: Buffer.from(JSON.stringify(data)),
				name: 'backup.json',
			},
		],
	});
}
