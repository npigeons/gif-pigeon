import * as Database from '../database.js';
import * as Globals from '../globals.js';
import * as Discord from 'discord.js';
import * as TagChannels from '../channels/tagChannels.js';
import * as Logs from '../channels/logs.js';
import * as Utils from '../utils.js';

const SUCCESS_MSG = `Channel created! Remember to change its permissions.
You can also change its name and move it to different category.`;

// TODO: Limit code duplication (here and in releaseThePigeon.js).

export async function action(interaction) {
	const tagExpr = interaction.options.getString('tag-expression');

	await Logs.info(`Started creating a tag channel "${tagExpr}"`);

	const { client, guild } = Globals;
	const { GuildCategory, GuildText } = Discord.ChannelType;
	const { ViewChannel, SendMessages } = Discord.PermissionsBitField.Flags;
	const everyoneRole = guild.roles.cache.find((r) => r.name === '@everyone');
	const modRole = guild.roles.cache.find((r) => r.name === 'Mod');
	const permissionOverwrites = [
		{ id: everyoneRole.id, deny: ViewChannel | SendMessages },
		{ id: client.user.id, allow: ViewChannel | SendMessages },
		{ id: modRole.id, allow: ViewChannel },
	];

	let category = Globals.channels.find((c) => c.name === 'pigeonhole' && c.type === 4);
	if (!category) {
		category = await guild.channels.create({
			name: 'pigeonhole',
			type: GuildCategory,
			permissionOverwrites,
		});
	}
	const parent = category.id;

	const channel = await guild.channels.create({
		name: tagExpr.substring(0, 100),
		type: GuildText,
		topic: Globals.TAG_CHANNEL_TOPIC_PREFIX + tagExpr,
		parent,
		permissionOverwrites,
	});

	let gifs;
	try {
		gifs = Database.approvedGifs.filter((gif) => Utils.satisfiesTagExpr(gif, tagExpr));
	} catch (e) {
		await interaction.reply({
			content: `Error; see details in logs channel.`,
			ephemeral: true,
		});
		await Logs.warning('Error while creating a tag channel', e);
		await channel.delete();
		return;
	}

	await interaction.reply({ content: SUCCESS_MSG, ephemeral: true });
	for (const gif of gifs) await TagChannels.sendOrUpdateChannelMsg(gif, channel);

	await Logs.info(`Finished creating a tag channel "${tagExpr}"`);
}

export function addOptions(cmd) {
	cmd.addStringOption((option) => option.setName('tag-expression').setDescription("('dnd' and 'rowan') or (not 'ben')").setRequired(true));
}
