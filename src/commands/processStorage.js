import * as Database from '../database.js';
import * as AdminApprove from '../channels/adminMsgTypes/approve.js';

export async function action(interaction) {
	await interaction.reply({ content: 'Sending admin message for all non-approved GIFs in storage.', ephemeral: true });
	const DUPLICATES = [
		'https://cdn.discordapp.com/attachments/1083425209144578068/1083815058343215154/ezgif-2-542b14de5c.gif',
		'https://cdn.discordapp.com/attachments/1083425209144578068/1085296474243473499/ezgif-2-5c998fb53d.gif',
	];
	for (const gif of Database.storageGifs) {
		if (!gif.approved && !gif.approveMsgId && !DUPLICATES.includes(gif.storageUrl)) {
			await AdminApprove.send(gif);
		}
	}
}
