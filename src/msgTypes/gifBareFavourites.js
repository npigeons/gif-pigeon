import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function getDataFromMsg(msg) {
	return { mainUrl: msg.content };
}

export function isMsgGeneratedByThisView(msg) {
	return msg.content.split(' ').length == 1 && msg.content.startsWith('https://') && msg.components.length === 1;
}

export function getMessageOptions(gif) {
	const favouritesButton = new ButtonBuilder().setCustomId('add-to-favourites-button').setLabel('Add to favourites').setStyle(ButtonStyle.Success);
	const components = [new ActionRowBuilder().addComponents(favouritesButton)];
	return { content: gif.mainUrl, components };
}
