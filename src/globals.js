// Variables defined here are essentially global variables.
// (I imagine a "proper practice" would be to use the Singleton design pattern, but what's the difference?)

export const DISCORD_CDN = 'https://cdn.discordapp.com/';
export const DISCORD_PROXY = 'https://media.discordapp.net/';
export const TENOR = 'https://tenor.com/';
export const GIPHY = 'https://giphy.com/';
export const TAG_CHANNEL_TOPIC_PREFIX = 'GIF Pigeon tag channel: ';
export const PERSONAL_CHANNEL_TOPIC_PREFIX = 'Personal channel for user ';

export let client;
export function setClient(value) {
	if (client) throw Error('Client already initialized!');
	client = value;
}

export let isGuildSetUp = false; // Whether all necessary channels/categories exist.

export let guild; // discord.js Guild
export let channels; // discord.js Collection of Channels
export let dump, storage, approved, rejected, admin, logs, events, approvedMP4; // discord.js TextChannel

export const CHANNEL_NAMES = {
	dump: 'gif-dump',
	storage: 'gif-storage',
	approved: 'gif-library',
	approvedMP4: 'mp4-library',
	admin: 'control-room',
	logs: 'pigeon-logs',
	rejected: 'rejected-gifs',
	events: 'events',
};

export function refreshChannels() {
	guild = client.guilds.cache.get(process.env.guildID);
	channels = guild.channels.cache;

	dump = channels.find((c) => c.name === CHANNEL_NAMES.dump);
	storage = channels.find((c) => c.name === CHANNEL_NAMES.storage);
	approved = channels.find((c) => c.name === CHANNEL_NAMES.approved);
	rejected = channels.find((c) => c.name === CHANNEL_NAMES.rejected);
	admin = channels.find((c) => c.name === CHANNEL_NAMES.admin);
	logs = channels.find((c) => c.name === CHANNEL_NAMES.logs);
	events = channels.find((c) => c.name === CHANNEL_NAMES.events);
	approvedMP4 = channels.find((c) => c.name === CHANNEL_NAMES.approvedMP4);
	if (dump && storage && approved && rejected && admin && logs && events) isGuildSetUp = true;
}

export async function checkIfGuildIsSetUp() {
	isGuildSetUp = events && (await events.messages.fetch({ limit: 1 })).size;
}
