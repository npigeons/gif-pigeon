import * as Globals from '../globals.js';
import * as Logs from './logs.js';
import * as Dump from './dump.js';
import * as Approved from './approved.js';
import * as AdminApprove from './adminMsgTypes/approve.js';
import * as AdminEditTags from './adminMsgTypes/editTags.js';
import * as AdminNoGifWarning from './adminMsgTypes/noGifWarning.js';
import * as AdminReupload from './adminMsgTypes/reupload.js';
import * as AdminTagsSuggestion from './adminMsgTypes/tagsSuggestion.js';
import * as PersonalChannels from './personalChannels.js';
import * as TagChannels from './tagChannels.js';
import * as Admin from './admin.js';
import * as Database from '../database.js';
import * as Storage from './storage.js';
import * as Rejected from './rejected.js';
import { appendFileSync } from 'fs';
import * as Utils from '../utils.js';

/* TYPICAL JOURNEY OF A GIF */
export async function dumpMsgCreated(dumpMsg) {
	await Dump.reuploadGifsFromMsg(dumpMsg);
	// On a successful reupload, a message in send to storage
	// (which updates Database and storageMsgCreated is fired).
}

export async function gifReuploaded(gif) {
	// We save important events, e.g. to re-calculate user points if needed.
	await saveEvent('REUPLOAD', { gif });

	if (gif.reuploadMsgId) await AdminReupload.remove(gif);
}

export async function storageMsgCreated(storageMsg) {
	const gif = Database.getGif(storageMsg.id);
	await AdminApprove.send(gif);
}

export async function gifApproved(gif, approvedTags, approvingUserId) {
	await saveEvent('APPROVE_GIF', { gif, approvedTags, approvingUserId });

	await Approved.send(gif, approvedTags); // This will trigger "approvedMsgCreated" event.
	// TODO: give points to user?
	if (gif.dumpTagsSuggestion) AdminTagsSuggestion.sendDumpSuggestions(gif);

	// Switches "approve" message to "do you want to edit tags manually".
	await AdminEditTags.edit(gif, gif.approveMsgId);
}

export async function gifTagsEdited(gif, newTags, editingUserId) {
	await saveEvent('EDIT_TAGS', { gif, newTags, editingUserId });
	await AdminEditTags.remove(gif);
	await Utils.sleep(5000);
	await Approved.replaceTags(gif, newTags);
}

export async function approvedMsgCreated(approvedMsg) {
	const gif = Database.getGif(approvedMsg.id);
	await TagChannels.update(gif);
}

export async function tagsSuggestionSubmitted(gif, tags, authorId) {
	await AdminTagsSuggestion.send(gif, tags, authorId);
}

export async function tagsSuggestionApproved(gif, tagsSuggestion, approvedTags, approvingUserId) {
	await saveEvent('APPROVE_TAGS', { gif, tagsSuggestion, approvedTags, approvingUserId });

	await Approved.addTags(gif, approvedTags); // This will trigger "approvedMsgChanged" event.
	// TODO: give points to user?
	await AdminTagsSuggestion.remove(tagsSuggestion);
}

export async function approvedMsgChanged(oldMsg, newMsg) {
	const gif = Database.getGif(newMsg.id);
	if (oldMsg.content === newMsg.content) {
		console.log('message content did not change (embed?)', newMsg.url, gif.mainUrl);
		return;
	}
	await TagChannels.update(gif);
	await PersonalChannels.update(gif);
}

export async function approvedMsgDeleted(msg) {
	const gif = Database.getGif(msg.id);
	await TagChannels.update(gif);
}

/* REJECTING STUFF */
export async function gifRejected(gif) {
	await Rejected.rejectGif(gif);
	await Admin.remove(gif);
	await Storage.remove(gif);
}

export async function tagsSuggestionRejected(tagsSuggestion) {
	await AdminTagsSuggestion.remove(tagsSuggestion);
}

// Setting up the bot - creating necessary channels and sending existing GIFs (with tags) to #approved.
export async function migrationStarted() {
	await Logs.info('Started setting up the bot.');
}
export async function migrationFinished() {
	await saveEvent('MIGRATION_FINISHED');
	await Logs.info('Finished setting up the bot.\nRemember to change channels permissions.');
}

/* EDGE CASES */

// If no GIFs were found, ask mods to check it manually and confirm.
export async function dumpMsgWithoutGifsDetected(dumpMsg) {
	await AdminNoGifWarning.send(dumpMsg);
}

export async function acknowledgeNoGifWarning(dumpMsgUrl) {
	// Message is rejected - we'll completely ignore it from now on.
	await Rejected.rejectDumpMsg(dumpMsgUrl);
	await AdminNoGifWarning.remove(dumpMsgUrl);
}

export async function gifReuploadFailed(gif) {
	if (!gif.reuploadMsgId) await AdminReupload.send(gif);
}

// Warning: this does not trigger if someone deletes their own message!
// It's probably on Discord / discord.js side (maybe by design?).
export async function dumpMsgDeleted(dumpMsg) {
	saveEvent('DUMP_MSG_DELETED', { dumpMsgUrl: dumpMsg.url });
	const gifsData = Dump.getDataFromMsg(dumpMsg);
	for (const gifData of gifsData) {
		const gif = Database.getGif(gifData);
		if (!gif.approved) await Storage.remove(gif);
	}
}

export async function storageMsgDeleted(msg) {
	const data = Storage.getDataFromMsg(msg);
	const gif = Database.getGif(data);
	await Admin.remove(gif);
	await Approved.remove(gif);
	await TagChannels.remove(gif);
	await PersonalChannels.remove(gif);
}

/* SAVING EVENT INFORMATION */
const allowedMentions = { parse: [] };
async function saveEvent(eventName, data) {
	if (!data) data = {};
	data = { ...data };
	data.event = eventName;
	// Cleaning up some parts of the data.
	if (data.gif) {
		data.dumpMsgUrl = data.gif.dumpMsgUrl;
		data.authorMention = data.gif.authorMention;
		data.storageUrl = data.gif.storageUrl;
		data.dumpUrl = data.gif.dumpUrl;
		delete data.gif;
	}
	if (data.tagsSuggestion) {
		data.tagsSuggestion = { ...data.tagsSuggestion };
		delete data.tagsSuggestion.mainUrl;
		delete data.tagsSuggestion.isTagProposition;
		delete data.tagsSuggestion.msgId;
	}
	// Discord allows messages of length at most 2000.
	const content = JSON.stringify(data);
	appendFileSync('events.log', content + '\n');
	const chunks = splitStringIntoChunks(content, 2000);
	for (const chunk of chunks) await Globals.events.send({ content: chunk, allowedMentions });
}

function splitStringIntoChunks(string, chunkSize) {
	const chunks = [];
	let index = 0;

	while (index < string.length) {
		chunks.push(string.substring(index, index + chunkSize));
		index += chunkSize;
	}

	return chunks;
}
