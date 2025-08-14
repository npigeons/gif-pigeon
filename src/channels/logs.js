import { logs } from '../globals.js';

const allowedMentions = { parse: [] };

function getMsg(content, e) {
	if (!e) return content;
	return `${content} (${e})`;
}

export async function info(content, e) {
	console.log('Info:', content);
	if (e) console.log(e.stack);
	if (!logs) return;
	await logs.send({ content: 'Info: ' + getMsg(content, e), embeds: [], allowedMentions });
}

export async function warning(content, e) {
	console.log('Warning:', content);
	if (e) console.log(e.stack);
	if (!logs) return;
	await logs.send({ content: 'Warning: ' + getMsg(content, e), embeds: [], allowedMentions });
}

export async function error(content, e) {
	console.log('Error:', content);
	if (e) console.log(e.stack);
	if (!logs) return;
	await logs.send({ content: 'Error: ' + getMsg(content, e), embeds: [], allowedMentions });
}

const queue = [];
export function syncWarning(content, e) {
	console.log('Warning:', content);
	if (e) console.log(e.stack);
	queue.push('Warning: ' + getMsg(content, e));
}

export function syncInfo(content, e) {
	console.log('Info:', content);
	if (e) console.log(e.stack);
	queue.push('Info: ' + getMsg(content, e));
}

export function sendSyncLogs() {
	if (!logs) return;
	if (!queue.length) return;
	let msg = '';
	if (queue.length > 0 && queue[0].length > 2000) queue[0] = queue[0].substring(0, 1999);
	while (queue.length > 0 && msg.length + queue[0].length < 2000) msg += queue.splice(0, 1)[0] + '\n';
	logs.send({ content: msg, embeds: [], allowedMentions });
}
