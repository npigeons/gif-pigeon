import * as Database from '../database.js';
import * as Globals from '../globals.js';
import * as Discord from 'discord.js';
import * as Utils from '../utils.js';
import * as EmbedView from '../msgTypes/gifEmbedAuthorTagsButton.js';
import * as UrlView from '../msgTypes/gifUrlAuthorTagsButton.js';
import * as BareView from '../msgTypes/gifBare.js';
import { send } from '../channels/personalChannels.js';

export async function action(interaction) {
	/* const msgId = interaction.targetId;
	let gif = Database.getGif(msgId);
	if (!gif) {
		try {
			const msg = await Globals.dump.messages.fetch(msgId);
			const gifs = Database.gifsByDumpMsgUrl[msg.url];
			if (gifs && gifs.length) gif = gifs[0];
		} catch (e) {}
		if (!gif || !gif.mainUrl) {
			const content = 'Command failed; does this message contain a GIF?';
			await interaction.reply({ content, ephemeral: true });
			return;
		}
	} */
	const gif = Database.getGif(interaction.message.id);
	try {
		const channel = await getOrCreatePersonalChannel(interaction.user);
		if (gif.personalChannelMsgId[channel.id]) {
			const content = 'GIF is already in your favourites.';
			await interaction.reply({ content, ephemeral: true });
			return;
		}
		if (!gif.approved) {
			await interaction.reply({ content: 'How did you do that?', ephemeral: true });
			// await channel.send(BareView.getMessageOptions(gif));
			// await interaction.reply({
			// 	content: 'GIF added to favourites.',
			// 	ephemeral: true,
			// });
			return;
		}
		await send(gif, channel);
		await interaction.deferUpdate();
		// await interaction.reply({
		// 	content: 'GIF added to favourites.',
		// 	ephemeral: true,
		// });
	} catch (e) {
		await interaction.reply({ content: `${e}`, ephemeral: true });
		console.log(e);
	}
}

async function getOrCreatePersonalChannel(user) {
	const { client, guild } = Globals;
	const { GuildCategory, GuildText } = Discord.ChannelType;
	const { ViewChannel, ManageMessages } = Discord.PermissionsBitField.Flags;
	const everyoneRole = guild.roles.cache.find((r) => r.name === '@everyone');
	const modRole = guild.roles.cache.find((r) => r.name === 'Mod');
	const permissionOverwrites = [
		{ id: everyoneRole.id, deny: ViewChannel },
		{ id: user.id, allow: ViewChannel }, //  | ManageMessages
		{ id: client.user.id, allow: ViewChannel },
		{ id: modRole.id, allow: ViewChannel },
	];

	let category = Globals.channels.find((c) => c.name === 'Personal channels (group 2)' && c.type === 4);
	if (!category) {
		category = await guild.channels.create({
			name: 'Personal channels (group 2)',
			type: GuildCategory,
		});
	}
	const parent = category.id;

	const topic = Globals.PERSONAL_CHANNEL_TOPIC_PREFIX + user.id;
	let channel = Globals.channels.find((c) => c.topic === topic);
	if (!channel) {
		channel = await guild.channels.create({
			name: user.username + '-favourites',
			type: GuildText,
			topic,
			parent,
			permissionOverwrites,
		});
	}
	return channel;
}
