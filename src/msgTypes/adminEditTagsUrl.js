import * as Discord from 'discord.js';

const MSG = 'Edit tags for the GIF below (or click "Not now" and dismiss this message).';

export function getMessageOptions(gif) {
	const content = 'URL: ' + gif.mainUrl + '\n' + MSG;
	const components = getComponents();
	return { content, components };
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
	const lines = msg.content.split('\n');
	return lines[0].startsWith('URL: ') && lines[1] === MSG;
}

export function getDataFromMsg(msg) {
	return {
		isEditTagsMsg: true,
		mainUrl: msg.content.split('\n')[0].substring(5),
		editTagsMsgId: msg.id,
	};
}
