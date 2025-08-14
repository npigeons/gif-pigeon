import * as Approve from './adminMsgTypes/approve.js';
import * as EditTags from './adminMsgTypes/editTags.js';
import * as Reupload from './adminMsgTypes/reupload.js';
import * as TagProposition from './adminMsgTypes/tagsSuggestion.js';
import * as NoGifWarning from './adminMsgTypes/noGifWarning.js';
import * as Utils from '../utils.js';

const views = [Approve, EditTags, Reupload, TagProposition, NoGifWarning];
export function getDataFromMsg(msg) {
	return Utils.getDataFromViews(msg, views);
}

export async function remove(gif) {
	const views = [Approve, EditTags, Reupload];
	// Remove gif entirely from admin channel.
	for (const view of views) await view.remove(gif);
	await TagProposition.removeAll(gif);
}
