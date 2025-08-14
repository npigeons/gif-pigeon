import * as Globals from './globals.js';
import { Collection } from 'discord.js';
import { compileExpression } from 'filtrex';

export function isMod(member) {
	return member.roles.cache.some((role) => role.name === 'Mod' || role.name === 'Admin');
}

export function randomChoice(array) {
	return array[Math.floor(Math.random() * array.length)];
}

export async function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

export function isCdnUrl(url) {
	return url.startsWith(Globals.DISCORD_CDN);
}

export function isTenorOrGiphyUrl(url) {
	return url && (url.startsWith(Globals.TENOR) || url.startsWith(Globals.GIPHY));
}

export function isTenorUrl(url) {
	return url && url.startsWith(Globals.TENOR);
}

export function getDataFromViews(msg, views) {
	for (const view of views) if (view.isMsgGeneratedByThisView(msg)) return view.getDataFromMsg(msg);
	throw Error(`unknown type of message: ${msg.url}`);
}

export function isMsgGeneratedByViews(msg, views) {
	return views.some((view) => view.isMsgGeneratedByThisView(msg));
}

// Returns a discord.js Collection of Messages.
export async function getAllChannelMsgs(channel) {
	const messages = new Collection();
	let chunk = await channel.messages.fetch({ limit: 100 });
	while (chunk.size) {
		for (const [messageId, message] of chunk) messages.set(messageId, message);
		chunk = await channel.messages.fetch({ limit: 100, before: chunk.lastKey() });
	}
	return messages;
}

// Returns a discord.js Collection of CategoryChannels: https://discordjs.guide/additional-info/collections.html.
export function getOldGifCategories() {
	const channels = Globals.channels;
	const categories = channels.filter((c) => c.type == 4 && c.name.toLowerCase().includes('gifs'));
	categories.sort((c1, c2) => c1.position - c2.position);
	return categories;
}

// Returns a discord.js Collection of Channels.
export function getCategoryChannels(categoryId) {
	const result = Globals.channels.filter((c) => c.parent?.id == categoryId);
	result.sort((c1, c2) => c1.position - c2.position);
	return result;
}

// Returns a discord.js Collection of Channels.
export function getTagChannels() {
	// const categories = await getGifCategories();
	return Globals.channels.filter((c) => isTagChannel(c));
}

export function getSimpleTagChannels() {
	// const categories = await getGifCategories();
	return Globals.channels.filter((c) => isTagChannel(c) && isSimpleExpr(getTagChannelExpr(c)));
}

export function getPersonalChannels() {
	return Globals.channels.filter((c) => isPersonalChannel(c));
}

export function isPersonalChannel(channel) {
	return channel.topic && channel.topic.startsWith(Globals.PERSONAL_CHANNEL_TOPIC_PREFIX);
}

export function isTagChannel(channel) {
	return channel.topic && channel.topic.startsWith(Globals.TAG_CHANNEL_TOPIC_PREFIX);
}

function isSimpleExpr(expr) {
	return !expr.includes(' ') && !expr.includes('(');
}

export function getTagChannelExpr(channel) {
	return channel.topic.substring(Globals.TAG_CHANNEL_TOPIC_PREFIX.length);
}

export function getMsgIdFromUrl(msgUrl) {
	return msgUrl.split('/')[6];
}

export function getUserIdFromMention(m) {
	if (m[0] == '<') m = m.substring(1, m.length - 1);
	if (m[0] == '@') m = m.substring(1);
	return m;
}

export function normalizeTag(tag) {
	tag = tag.toLowerCase().trim().replaceAll(' ', '-').replaceAll("'", '');
	while (tag.indexOf('--') != -1) tag.replace('--', '-');
	return tag;
}

export function normalizeTags(tags) {
	// Changes to lowercase, replaces spaces with '-', removes duplicates.
	return [...new Set(tags.map(normalizeTag).filter((tag) => tag.length))];
}

export function contentFromFields(fields, data) {
	const fieldsStr = [];
	for (const field of fields) {
		const prefix = field.variants[0].prefix || '';
		const suffix = field.variants[0].suffix || '';
		if (!field.name) fieldsStr.push(prefix + suffix);
		else if (data[field.name] != undefined) fieldsStr.push(prefix + data[field.name] + suffix);
	}
	return fieldsStr.join('\n');
}

export function fieldsFromContent(content, fields) {
	// TODO: warn about overwriting or unrecognized lines?
	const data = {};
	for (const line of content.split('\n')) {
		if (line.length === 0) continue;
		for (const field of fields) {
			if (field.name === '') continue;
			for (const fv of field.variants) {
				const prefix = fv.prefix || '';
				const suffix = fv.suffix || '';
				if (line.startsWith(prefix.trim()) && line.endsWith(suffix.trim())) {
					data[field.name] = line.substring(prefix.length, line.length - suffix.length);
				}
			}
		}
	}
	return data;
}

export function satisfiesTagExpr(gif, tagExpr) {
	const customProp = (tag) => gif.tags.map((tag) => tag.replace('-', '_')).includes(tag);
	const expr = compileExpression(tagExpr.replace('-', '_'), { customProp });
	return expr(gif);
}
