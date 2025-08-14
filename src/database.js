import { channels, admin, approved, dump, rejected, storage, client, approvedMP4 } from './globals.js';
import { syncWarning } from './channels/logs.js';
import * as Utils from './utils.js';
import * as AdminDb from './databaseHelpers/adminDb.js';
import * as ApprovedDb from './databaseHelpers/approvedDb.js';
import * as DumpDb from './databaseHelpers/dumpDb.js';
import * as PersonalChannelsDb from './databaseHelpers/personalChannelsDb.js';
import * as RejectedDb from './databaseHelpers/rejectedDb.js';
import * as StorageDb from './databaseHelpers/storageDb.js';
import * as TagChannelsDb from './databaseHelpers/tagChannelsDb.js';

export let loaded = false;
const gifByUrl = {};
const gifByMsgId = {};
export const storageGifs = new Set();
export const gifsByDumpMsgUrl = {};
export const noGifWarning = {};
export const approvedGifs = [];
export const rejectedDumpMsgIds = new Set();
export const msgIdToUrl = {};

const json = JSON.stringify;

// "Protected" fields in Gif (if it gets overwritten, issue a warning).
const URLS = new Set(...(['dump', 'storage', 'main'].map((x) => x + 'Url')));
const MSG_URLS = ['dump'].map((x) => x + 'MsgUrl');
const MSG_IDS = ['dump', 'storage', 'approve', 'reupload', 'editTags', 'approved', 'rejected'].map((x) => x + 'MsgId');
const PROTECTED_FIELDS = new Set([...MSG_URLS, ...MSG_IDS, 'authorId', 'authorMention']);
export class Gif {
	constructor() {
		this.tagChannelMsgId = {}; // { channelId: msgId }
		this.personalChannelMsgId = {}; // { channelId: msgId }
		this.tagsSuggestions = [];
		this.tags = [];
	}

	registerInDb(data, msg = null) {
		for (const [key, value] of Object.entries(data)) {
			if (PROTECTED_FIELDS.has(key) && this[key] && this[key] !== value) syncWarning(`overwriting protected field ${key}\n${json(this)}\n${json(data)}`);
			if (URLS.has(key) && this[key] && cleanUrl(this[key]) !== cleanUrl(value)) syncWarning(`overwriting protected url ${key}\n${value}\n${this[key]}\n${json(this)}\n${json(data)}`);
		}

		if (data.approved && !this.approved) approvedGifs.push(this);
		if (data.authorId && this.authorId && this.authorId !== data.authorId) {
			delete data.authorId;
			if (data.authorMention) delete data.authorMention;
		}

		// Copy all properties from 'data' to 'this'.
		Object.assign(this, data);

		if (msg) {
			const old = gifByMsgId[msg.id];
			if (old && old !== this) syncWarning(`overwriting gifByMsgId for ${msg.url}`);
			gifByMsgId[msg.id] = this;
		}
		// this.mainUrl = cleanUrl(this.mainUrl);
		// this.storageUrl = cleanUrl(this.storageUrl);
		// this.dumpUrl = cleanUrl(this.dumpUrl);
		if (this.mainUrl) registerMainUrl(this.mainUrl, this);
		if (this.storageUrl) registerStorageUrl(this.storageUrl, this);
		if (this.dumpMsgUrl && this.dumpUrl) registerDumpGif(this.dumpMsgUrl, this.dumpUrl, this);
	}
}

function cleanUrl(url) {
	if (!url) return url;
	let i = url.indexOf('?');
	if (i !== -1) return url.substring(0, i);
	else return url;
}

/* 
Rules:
 - gif.storageUrl is unique;
 - pairs (gif.dumpMsgUrl, gif.dumpUrl) are unique [we ignore duplicates];
 - only one gif with a given gif.dumpUrl can be approved / reuploaded / managed in any way;
   others have gif.duplicateDumpUrl = true;
 - gif.mainUrl is either gif.storageUrl or gif.dumpUrl (dumpUrl e.g. for Tenor links).
*/

function registerMainUrl(url, gif) {
	const old = gifByUrl[cleanUrl(url)];
	if (old && old !== gif) syncWarning(`overwriting mainUrl\n${json(old)}\n${json(gif)}`);
	gifByUrl[cleanUrl(url)] = gif;
}

function registerStorageUrl(url, gif) {
	const old = gifByUrl[cleanUrl(url)];
	if (old && old !== gif) syncWarning(`overwriting storageUrl\n${json(old)}\n${json(gif)}`);
	gifByUrl[cleanUrl(url)] = gif;
}

function registerDumpGif(dumpMsgUrl, dumpUrl, gif) {
	const gifs = gifsByDumpMsgUrl[dumpMsgUrl];
	if (gifs) {
		let old = gifs.find((gif) => cleanUrl(gif.dumpUrl) === cleanUrl(dumpUrl));
		if (old && old !== gif) syncWarning(`overwriting dump gif\n${json(old)}\n${json(gif)}`);
		if (!old) gifs.push(gif);
	} else gifsByDumpMsgUrl[dumpMsgUrl] = [gif];

	const other = gifByUrl[cleanUrl(dumpUrl)];
	if (other && other !== gif) {
		if (gif.storageUrl) syncWarning(`duplicate dumpUrl error!\n${json(gif)}\n${json(other)}`);
		gif.duplicateDumpUrl = true;
	} else if (gif.storageUrl) gifByUrl[cleanUrl(dumpUrl)] = gif;
}

export function getDumpGif({ dumpMsgUrl, dumpUrl }) {
	return gifsByDumpMsgUrl[dumpMsgUrl]?.find((gif) => cleanUrl(gif.dumpUrl) === cleanUrl(dumpUrl));
}

export function getGif(data) {
	if (typeof data === 'string') return gifByUrl[cleanUrl(data)] || gifByMsgId[data];
	return gifByUrl[cleanUrl(data.mainUrl)] || gifByUrl[cleanUrl(data.storageUrl)] || getDumpGif(data);
}

/* Handling messages. */

export function msgCreated(msg) {
	msgIdToUrl[msg.id] = msg.url;
	const channel = channels.get(msg.channelId);
	if (msg.channelId === storage.id) StorageDb.msgCreated(msg);
	else if (msg.channelId === dump.id) DumpDb.msgCreated(msg);
	else if (msg.channelId === admin.id) AdminDb.msgCreated(msg);
	else if (msg.channelId === approved.id || msg.channelId === approvedMP4.id) ApprovedDb.msgCreated(msg);
	else if (msg.channelId === rejected.id) RejectedDb.msgCreated(msg);
	else if (Utils.isTagChannel(channel)) TagChannelsDb.msgCreated(msg, channel);
	else if (Utils.isPersonalChannel(channel)) PersonalChannelsDb.msgCreated(msg, channel);
}

export function msgUpdated(oldMsg, newMsg) {
	if (newMsg.channelId === approved.id || newMsg.channelId === approvedMP4.id) ApprovedDb.msgUpdated(oldMsg, newMsg);
	else if (newMsg.channelId === admin.id) AdminDb.msgUpdated(oldMsg, newMsg);
}

export function msgDeleted(msg) {
	const channel = channels.get(msg.channelId);
	if (msg.channelId === admin.id) AdminDb.msgDeleted(msg);
	else if (msg.channelId === storage.id) StorageDb.msgDeleted(msg);
	else if (Utils.isTagChannel(channel)) TagChannelsDb.msgDeleted(msg, channel);
	else if (Utils.isPersonalChannel(channel)) PersonalChannelsDb.msgDeleted(msg, channel);
	else if (msg.channelId === approved.id || msg.channelId === approvedMP4.id) ApprovedDb.approvedMsgDeleted(msg);
	// else if (msg.channelId === dump.id) dumpMsgDeleted(msg);
	// else if (msg.channelId === admin.id) adminMsgDeleted(msg);
	// else if (msg.channelId === rejected.id) rejectedMsgDeleted(msg);
}

/* Loading the database - reading all messages in the server. */
export function markAsLoaded() {
	loaded = true;
}

export async function load() {
	console.time('dbLoad');
	const channels = [storage, dump, approved, approvedMP4, admin, rejected, ...Utils.getTagChannels().values(), ...Utils.getPersonalChannels().values()];
	const channelsMsgs = await Promise.all(channels.map(Utils.getAllChannelMsgs));
	const n = channels.length;
	for (let i = 0; i < n; i++) loadChannel(channels[i], channelsMsgs[i]);
	console.timeEnd('dbLoad');
	loaded = true;
}

async function loadChannel(channel, msgs) {
	console.log('loading', msgs.size, 'messages from', channel.name);
	msgs = msgs.reverse();
	// const msgs = (await Utils.getAllChannelMsgs(channel)).reverse();
	for (const msg of msgs.values()) {
		try {
			msgCreated(msg);
		} catch (e) {
			syncWarning(`Error while processing message`, e);
		}
	}
}
