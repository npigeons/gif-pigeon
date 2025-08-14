import { EmbedBuilder } from 'discord.js';
import * as Approved from '../channels/approved.js';
import * as TagChannels from '../channels/tagChannels.js';
import * as PersonalChannels from '../channels/personalChannels.js';
import { approved, client, logs } from '../globals.js';
import { getAllChannelMsgs, getPersonalChannels, getTagChannels } from '../utils.js';
import * as Database from '../database.js';
import * as UrlView from '../msgTypes/gifUrlAuthorTagsButtonFav.js';

export async function action(interaction) {
	interaction.reply({ content: 'refreshing all messages', ephemeral: true });

	console.log('refreshing personal channels');

	const channels = getPersonalChannels().values();
	for (const channel of channels) {
		const msgs = await getAllChannelMsgs(channel);
		for (const msg of msgs.values()) {
			if (msg.author.id !== client.user.id) continue;
			if (msg.components.length === 1 && msg.components[0].components.length === 2) {
				// console.log('message already has two buttons, omitting');
				continue;
			}
			await PersonalChannels.refresh(msg);
		}
	}

	console.log('refreshing all the rest');

	const toSendA = [];

	const msgs = await getAllChannelMsgs(approved);
	for (const msg of msgs.values()) {
		if (msg.components.length === 1 && msg.components[0].components.length === 2) {
			// console.log('message already has two buttons, omitting');
			continue;
		}
		await Approved.refresh(msg);
		toSendA.push(msg);
	}

	const toSendT = [];
	for (const channel of getTagChannels().values()) {
		// 	console.log(channel.name);
		const msgs = await getAllChannelMsgs(channel);
		for (const msg of msgs.values()) {
			if (msg.components.length === 1 && msg.components[0].components.length === 1) {
				// console.log('message already has one button, omitting');
				continue;
			}
			await TagChannels.refresh(msg);
			toSendT.push(msg);
		}
	}
	// A (not very good) random shuffle of the array.
	// Discord has some strange, undocumented(?) rate limits for editing multiple messages on the same channel, I think.
	toSendT.sort(() => Math.random() - 0.5);

	const ratio = Math.ceil(toSendT.length / toSendA.length);
	console.log('ratio:', ratio);
	let k = 0;
	for (let i = 0; i < toSendA.length; i++) {
		const msg = toSendA[i];
		await Approved.refresh(msg);
		for (let j = 0; j < ratio; j++) {
			if (k >= toSendT.length) break;
			await TagChannels.refresh(toSendT[k]);
			k += 1;
		}
	}
	while (k < toSendT.length) {
		await TagChannels.refresh(toSendT[k]);
		k += 1;
	}

	console.log('finished refreshing!');
}
