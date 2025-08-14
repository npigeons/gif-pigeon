import { storage, DISCORD_CDN, DISCORD_PROXY, dump } from '../globals.js';
import * as Utils from '../utils.js';
import { execSync } from 'child_process';
import fetch from 'node-fetch';
import * as Messages from '../messages.js';
import * as UrlGifView from '../msgTypes/gifStorageUrl.js';
import * as AttachmentGifView from '../msgTypes/gifStorageAttachment.js';
import * as Events from './events.js';
import { createWriteStream, fstat } from 'fs';

let imgurAccessToken = '';

export function getDataFromMsg(msg) {
	const data = Utils.getDataFromViews(msg, [UrlGifView, AttachmentGifView]);
	data.storageMsgId = msg.id;
	data.storageMsgUrl = msg.url;

	return data;
}


// Supported:
// https://images-ext-2.discordapp.net/external/Vtqa4gvYIpbJb8W9dtkpw9a7vx_rqC850KdPhj0otCY/%3Fcid%3D73b8f7b16a06bb7ec7a09e2adeeebebbf9b530e7ea0a0889%26ep%3Dv1_gifs_gifId%26rid%3Dgiphy.mp4%26ct%3Dg/https/media3.giphy.com/media/w3ssSvSolnYxQkBa0q/giphy.mp4
// Unsupported:
// https://images-ext-1.discordapp.net/external/oPLfo1kwTG3lXtrr7qEm8GoEwu2xL2wI9FndWscLxt8/https/media.tenor.com/z9FdcsnBzQ0AAAPo/zonedout-hmsorrywhat.mp4
const TENOR_GIF_REGEX = /https:\/\/media\.tenor\.com\/(.*)\.gif/;
const GIPHY_GIF_REGEX = /media(\d+)?.giphy.com\/media\/([^\/"]*\/)?([^\/"]*)\/giphy\.gif/;
export async function sendGif(gif) {
	if ((gif.dumpUrl.startsWith(DISCORD_CDN) && gif.dumpUrl.toLowerCase().includes('.gif')) || gif.dumpUrl.match(TENOR_GIF_REGEX) || gif.dumpUrl.match(GIPHY_GIF_REGEX)) {
		await storage.send(AttachmentGifView.getMessageOptions(gif));
	} else if (Utils.isTenorOrGiphyUrl(gif.dumpUrl)) {
		await reuploadTenorOrGiphyToImgur(gif);
		await storage.send(UrlGifView.getMessageOptions(gif));
	} else if (gif.dumpUrl.startsWith('https://imgur.com')) {
		gif.storageUrl = gif.dumpUrl;
		await storage.send(UrlGifView.getMessageOptions(gif));
	} else throw Error(`Unsupported URL: ${gif.dumpUrl}`);

	await Events.gifReuploaded(gif);
}

export async function remove(gif) {
	await Messages.tryToDelete(storage, gif.storageMsgId);
}

async function reuploadTenorOrGiphyToImgur(gif) {
	let MP4_REGEX;
	if (Utils.isTenorUrl(gif.dumpUrl)) MP4_REGEX = /media.tenor.com\/[^\/]*\/[^'"]*\.mp4/g;
	else MP4_REGEX = /(media\d+.giphy.com\/media\/[^"]*\.mp4)|(media(\d+)?.giphy.com\/media\/[^\/"]*\/[^\/"]*\/giphy.mp4])/g;
	const response = await fetch(gif.dumpUrl);
	const text = await response.text();
	const mp4url = text.match(MP4_REGEX)[0];
	// const gifurl = text.match(GIF_REGEX)[0];
	const url = await reuploadToImgur(mp4url, gif.dumpMsgId);
	gif.storageUrl = url;
}

// Imgur stuff - move it somewhere else?
async function reuploadToImgur(url, msgId) {
	if (imgurAccessToken === '') await refreshImgurToken();
	try {
		return uploadToImgur(url, msgId);
	} catch (e) {
		await refreshImgurToken();
		return uploadToImgur(url, msgId);
	}
}

async function refreshImgurToken() {
	const body = {
		refresh_token: process.env.imgurRefreshToken,
		client_id: process.env.imgurClientID,
		client_secret: process.env.imgurClientSecret,
		grant_type: 'refresh_token',
	};

	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(body)) params.append(key, value);

	const url = 'https://api.imgur.com/oauth2/token';
	const response = await fetch(url, { method: 'POST', body: params });
	const data = await response.json();
	imgurAccessToken = data.access_token;
}

function uploadToImgur(url, msgId) {
	if (imgurAccessToken === '') throw Error('empty Imgur access token');
	const command = `cd tools; ./imgur.sh "${imgurAccessToken}" "${url}" "${msgId}"`;
	const output = execSync(command);
	const res = JSON.parse(output.toString());
	if (!res.data.id) {
		console.log(res);
		throw Error('Unexpected response from Imgur:', res);
	}
	return 'https://imgur.com/' + res.data.id;
}
