import * as Discord from 'discord.js';

const MSG = 'Choose some tags and approve or reject the GIF below.';
const CATEGORY_SELECT_MENU_PLACEHOLDER_PREFIX = 'Choose channels for ';

export function isMsgGeneratedByThisView(msg) {
	return msg.content === MSG;
}

export function getMessageOptions(data) {
	const content = MSG;
	const embeds = [new Discord.EmbedBuilder().setImage(data.mainUrl)];
	const components = getComponents(data);
	return { content, embeds, components };
}

export function getDataFromMsg(msg) {
	const data = { isApproveMsg: true, storageUrl: msg.embeds[0].data.image.url, categories: [] };
	for (const row of msg.components) {
		if (row.components[0].type !== Discord.ComponentType.StringSelect) continue;
		const selectMenu = row.components[0];
		const categoryData = {
			id: selectMenu.customId.split('-').pop(),
			name: selectMenu.placeholder.substring(CATEGORY_SELECT_MENU_PLACEHOLDER_PREFIX.length),
			channels: [],
		};
		for (const option of selectMenu.options)
			categoryData.channels.push({
				id: option.value,
				name: option.label,
				chosen: option.default ? true : false,
			});
		data.categories.push(categoryData);
	}
	const chosenTags = [];
	for (const categoryData of data.categories)
		for (const channelData of categoryData.channels)
			if (channelData.chosen) chosenTags.push(channelData.name);
	data.chosenTags = chosenTags;
	data.approveMsgId = msg.id;
	return data;
}

function getComponents(data) {
	return [...getCategoriesRows(data), getButtonsRow()];
}

function getCategoriesRows(data) {
	const { ActionRowBuilder } = Discord;

	const components = [];
	for (const categoryData of data.categories) {
		const row = new ActionRowBuilder().addComponents(
			getCategorySelectMenu(categoryData, components.length)
		);
		components.push(row);
	}
	return components;
}

function getCategorySelectMenu(categoryData, categoryIndex) {
	const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = Discord;

	const select = new StringSelectMenuBuilder()
		.setCustomId('admin-approve-category-' + categoryIndex)
		.setPlaceholder(CATEGORY_SELECT_MENU_PLACEHOLDER_PREFIX + categoryData.name)
		.setMinValues(0)
		.setMaxValues(categoryData.channels.length);

	for (const channelData of categoryData.channels) {
		const option = new StringSelectMenuOptionBuilder()
			.setLabel(channelData.name)
			.setValue(channelData.id)
			.setDefault(channelData.chosen);
		select.addOptions(option);
	}
	return select;
}

function getButtonsRow() {
	const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = Discord;

	const confirm = new ButtonBuilder()
		.setCustomId('admin-manage-approve')
		.setLabel('Approve')
		.setStyle(ButtonStyle.Success);

	const reject = new ButtonBuilder()
		.setCustomId('admin-manage-reject')
		.setLabel('Reject')
		.setStyle(ButtonStyle.Danger);

	const row = new ActionRowBuilder().addComponents(confirm);
	row.addComponents(reject);

	return row;
}
