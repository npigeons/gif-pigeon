import * as Database from '../database.js';
import * as Utils from '../utils.js';
import * as TagChannels from '../channels/tagChannels.js';
import * as Approved from '../channels/approved.js';
import { syncWarning } from '../channels/logs.js';
import { approved } from '../globals.js';

export async function action(interaction) {
	const testRun = interaction.options.getBoolean('test_run');
	await interaction.reply({
		content: `Checking for duplicates and missing messages in tag channels (test run: ${testRun}).`,
		ephemeral: true,
	});
	for (const channel of Utils.getTagChannels().values()) {
		const msgs = await Utils.getAllChannelMsgs(channel);
		const gifs = Database.approvedGifs;
		let expected = gifs.filter((gif) => /* Utils.isCdnUrl(gif.mainUrl) && */ Utils.satisfiesTagExpr(gif, Utils.getTagChannelExpr(channel)));
		expected = new Set(expected);
		const found = new Set();
		for (const msg of msgs.values()) {
			const gif = Database.getGif(msg.id);
			if (!gif) {
				syncWarning('no gif found for message:', msg.url);
				continue;
			}
			const tagMsgId = gif.tagChannelMsgId[channel.id];
			if (tagMsgId && tagMsgId !== msg.id) {
				console.log('duplicate?', channel.name, msg.url, msg.content, gif.tags);
				if (!testRun) await msg.delete();
				continue;
			}
			found.add(gif);
			if (!expected.has(gif)) {
				console.log('unwanted GIF:', channel.name, msg.url, gif.tags);
				if (!testRun) await msg.delete();
				continue;
			}
			if (msg.embeds.length !== 1) {
				console.log('no embed?', msg.url);
				if (!testRun) await TagChannels.refresh(msg);
			}
		}
		for (const gif of expected) {
			if (!found.has(gif)) {
				console.log('missing GIF', channel.name, gif.tags, gif.mainUrl);
				if (!testRun) await TagChannels.update(gif);
			}
		}
	}
	const msgs = await Utils.getAllChannelMsgs(approved);
	for (const msg of msgs.values()) {
		if (msg.embeds.length !== 1) {
			console.log('no embed?', msg.url);
			if (!testRun) await Approved.refresh(msg);
		}
	}
	console.log('healthcheck finished');
}

export function addOptions(cmd) {
	cmd.addBooleanOption((option) =>
		option
			.setName('test_run')
			.setDescription("If set to True, will list all errors, but won't send/remove any messages on the server.")
			.setRequired(true)
	);
}
