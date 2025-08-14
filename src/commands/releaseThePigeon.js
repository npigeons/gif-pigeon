import * as Discord from 'discord.js';

import * as Approved from '../channels/approved.js';
import * as Database from '../database.js';
import * as Events from '../channels/events.js';
import * as Globals from '../globals.js';
import * as Logs from '../channels/logs.js';
import * as Utils from '../utils.js';

export async function action(interaction) {
	if (!Utils.isMod(interaction.member)) {
		await interaction.reply({ content: 'Only mods can release The Pigeon.', ephemeral: true });
		return;
	}
	if (Globals.isGuildSetUp) {
		await interaction.reply({ content: 'The Pigeon is already released!', ephemeral: true });
		return;
	}

	const SETTING_UP_MSG = 'Started setting up bot; logs should appear in a separate channel.';
	await interaction.reply({ content: SETTING_UP_MSG, ephemeral: true });
	await Events.migrationStarted();
	await createMissingChannels();
	try {
		await firstSetUp();
		await Events.migrationFinished();
		Database.markAsLoaded();
	} catch (e) {
		console.error(e);
		await Logs.error(`An error occured while setting up the bot!`, e);
	}
}

async function createMissingChannels() {
	const { client, guild, CHANNEL_NAMES } = Globals;
	const { GuildCategory, GuildText } = Discord.ChannelType;
	const { ViewChannel } = Discord.PermissionsBitField.Flags;
	const everyoneRole = guild.roles.cache.find((r) => r.name === '@everyone');
	const modRole = guild.roles.cache.find((r) => r.name === 'Mod');
	const permissionOverwrites = [
		{ id: everyoneRole.id, deny: ViewChannel },
		{ id: client.user.id, allow: ViewChannel },
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
	Globals.refreshChannels();
	for (const [cid, cname] of Object.entries(CHANNEL_NAMES)) {
		if (!Globals[cid]) {
			await guild.channels.create({
				name: cname,
				type: GuildText,
				parent,
				permissionOverwrites,
			});
		}
	}
	Globals.refreshChannels();
}

async function firstSetUp() {
	// Load all GIFs from storage.
	const { storage, DISCORD_CDN, DISCORD_PROXY } = Globals;
	const storageMsgs = await Utils.getAllChannelMsgs(storage);
	console.log(`Processing ${storageMsgs.size} storage messages.`);
	for (const msg of storageMsgs.values()) Database.msgCreated(msg);

	// Add to the database tags from GIF channels.
	const categories = Utils.getOldGifCategories();
	for (const category of categories.values()) {
		const channels = Utils.getCategoryChannels(category.id);
		for (const channel of channels.values()) {
			console.log('-----------------------------------------------');
			console.log(channel.name);
			let msgs;
			try {
				msgs = await Utils.getAllChannelMsgs(channel);
			} catch (e) {
				console.log(e);
				continue;
			}
			for (const msg of msgs.values()) {
				let url = msg.content;
				if (url.startsWith(DISCORD_PROXY)) url = url.replace(DISCORD_PROXY, DISCORD_CDN);
				if (!isStorageUrl(msg.content)) {
					if (msg.content.includes('tenor') || msg.content.includes('giphy')) continue;
					Logs.syncWarning(`GIF ${msg.url} has a non-gif-storage URL: ${msg.content}`);
					continue;
				}
				const gif = Database.getGif(msg.content);
				if (!gif) {
					Logs.syncWarning(`GIF ${msg.url} cannot be found in gif storage.`);
					continue;
				}
				if (channel.name !== 'miscellaneous') gif.tags.push(channel.name);
			}
			await Utils.sleep(1);
		}
	}
	const allGifs = [...Database.storageGifs].reverse();
	for (let gif of allGifs) {
		if (gif.tags.length === 0) {
			const msgId = gif.storageMsgId;
			const msg = await storage.messages.fetch(msgId);
			Logs.syncWarning(`GIF without any tags: ${msg.url}`);
			continue;
		}
		const msg = await Approved.send(gif, gif.tags);
		Database.msgCreated(msg);
	}
}

function isStorageUrl(url) {
	return url.split('/')[4] === Globals.storage.id;
}
