import * as Logs from './logs.js';
import * as Storage from './storage.js';
import * as Database from '../database.js';
import * as Events from './events.js';
import * as Utils from '../utils.js';
import * as Rejected from './rejected.js';
import { channels, DISCORD_CDN, DISCORD_PROXY } from '../globals.js';

// Returns the number of processed URLs.
export async function reuploadGifsFromMsg(msg) {
	if (Database.rejectedDumpMsgIds.has(msg.id)) return 0;
	const urls = getUrlsFromMsg(msg);
	if (urls.length === 0) {
		await Events.dumpMsgWithoutGifsDetected(msg);
		return 0;
	}
	const gifsData = getDataFromMsg(msg);
	let count = 0;
	for (const gifData of gifsData) {
		const gif = Database.getGif(gifData);
		if (!gif) {
			Logs.syncWarning(`Reuploading GIF not present in database: ${gifData}`);
			continue;
		}
		if (gif.storageUrl || gif.rejected) continue;
		if (gif.duplicateDumpUrl) {
			Logs.syncInfo(`GIF duplicate, rejecting: ${msg.url}\n${gif.dumpUrl}`);
			// TODO: message to admin to confirm?
			await Rejected.rejectGif(gif);
			continue;
		}
		count++;
		await reuploadGif(gif);
	}
	return count;
}

export async function reuploadGif(gif) {
	if (gif.storageUrl || gif.rejected || gif.duplicate) return;
	// Unexpected things might happen when re-uploading - we want to handle it nicely.
	try {
		await Storage.sendGif(gif);
	} catch (e) {
		console.log(e);
		await Logs.warning(`GIF reupload failed: ${gif.dumpMsgUrl} (${e})`);
		await Events.gifReuploadFailed(gif);
	}
}

export function getDataFromMsg(msg) {
	const authorId = msg.author.id;
	const authorMention = msg.author.toString();
	const dumpMsgUrl = msg.url;
	const dumpMsgId = Utils.getMsgIdFromUrl(dumpMsgUrl);

	const data = [];
	const urls = getUrlsFromMsg(msg);
	for (const dumpUrl of urls) data.push({ authorId, authorMention, dumpMsgUrl, dumpMsgId, dumpUrl });

	if (urls.length === 1) data[0].dumpTagsSuggestion = getTagsFromContent(msg.content);
	return data;
}

function proxyToCdn(url) {
	return url.startsWith(DISCORD_PROXY) ? url.replace(DISCORD_PROXY, DISCORD_CDN) : url;
}

const GIPHY_MEDIA_REGEX = /giphy\.com\/gifs\/[^\/"]*\/([^"]*)/;
function normalizeGiphy(url) {
	const giphyIdMatch = url.match(GIPHY_MEDIA_REGEX);
	if (giphyIdMatch) return 'https://giphy.com/gifs/' + giphyIdMatch3[1];
	return url;
}

function getUrlsFromMsg(msg) {
	const attachmentUrls = msg.attachments.map((att) => att.url);
	const contentUrls = msg.content.split(/\s+/).filter((w) => w.startsWith('http'));
	// Remove duplicate URLs.
	return [...new Set([...attachmentUrls, ...contentUrls].map(proxyToCdn).map(normalizeGiphy))];
}

function getTagsFromContent(s) {
	const words = s.split(/\s+/);
	const tags = words.filter((w) => w.startsWith('#')).map((w) => w.substring(1));
	for (const w of words) {
		if (w.startsWith('<#') && w.endsWith('>')) {
			try {
				tags.push(channels.get(w.substring(2, w.length - 1)).name);
			} catch (e) {
				console.log('error while getting tags from dump content:', w, s);
			}
		}
	}
	return tags.length ? Utils.normalizeTags(tags) : null;
}
