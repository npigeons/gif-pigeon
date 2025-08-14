import * as Discord from 'discord.js';

const MSG = 'Edit tags for the GIF below (or click "Not now" and dismiss this message).';

export function getMessageOptions(gif) {
	const content = MSG;
	const components = getComponents(gif);
	const embeds = [new Discord.EmbedBuilder().setImage(gif.mainUrl)];
	return { content, components, embeds };
}

export function getComponents() {
	const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = Discord;
	const yes = new ButtonBuilder()
		.setCustomId('admin-manual-tags-yes')
		.setLabel('Edit tags')
		.setStyle(ButtonStyle.Success);
	const no = new ButtonBuilder()
		.setCustomId('admin-manual-tags-no')
		.setLabel('Not now')
		.setStyle(ButtonStyle.Secondary);

	return [new ActionRowBuilder().addComponents(yes, no)];
}

export function isMsgGeneratedByThisView(msg) {
	return msg.content === MSG;
}

export function getDataFromMsg(msg) {
	return {
		isEditTagsMsg: true,
		mainUrl: msg.embeds[0].data.image.url,
		editTagsMsgId: msg.id,
	};
}
