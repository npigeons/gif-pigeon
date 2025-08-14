/*
This file handles communication with Discord:
 - connects to Discord;
 - registers slash commands (COMMANDS array);
 - defines which functions will be called when some events happen; this includes:
   + what happens when a message is created/updated/deleted;
   + all interactions (clicking a button, choosing select menu options etc.);
     because of that, all components must be listed here (in the COMPONENTS array).
 */

// Load environment variables from .env file.
import * as dotenv from 'dotenv';
dotenv.config();
import * as Discord from 'discord.js';

import * as Database from './database.js';
import * as Globals from './globals.js';

import * as Approved from './channels/approved.js';
import * as AdminApprove from './channels/adminMsgTypes/approve.js';
import * as AdminEditTags from './channels/adminMsgTypes/editTags.js';
import * as AdminTagsSuggestion from './channels/adminMsgTypes/tagsSuggestion.js';
import * as AdminReupload from './channels/adminMsgTypes/reupload.js';
import * as AdminNoGifWarning from './channels/adminMsgTypes/noGifWarning.js';
import * as Events from './channels/events.js';
import * as Logs from './channels/logs.js';

// import * as ReleaseThePigeon from './commands/releaseThePigeon.js';
import * as CreateTagChannel from './commands/createTagChannel.js';
import * as ProcessDump from './commands/processDump.js';
import * as ProcessStorage from './commands/processStorage.js';
import * as ManageGif from './commands/manageGif.js';
import * as AddToPersonalChannel from './commands/addToPersonalChannel.js';
import * as Backup from './commands/backup.js';
import * as AddMp4Tags from './commands/addMp4Tags.js';
import * as ReuploadRawToStorage from './commands/reuploadRawToStorage.js';
import * as ManageAllInChannel from './commands/manageAllInChannel.js';
import * as Healthcheck from './commands/healthcheck.js';
import * as Refresh from './commands/refresh.js';
import * as TempCommand from './commands/tempCommand.js';
import * as PersonalChannels from './channels/personalChannels.js';

const BOT_TOKEN = process.env.token;
const GUILD_ID = process.env.guildID;
const CLIENT_ID = process.env.clientID;

const SLASH_COMMANDS = [
	// {
	// 	name: 'release-the-pigeon',
	// 	description: 'Release The Pigeon! (sets up the bot)',
	// 	action: ReleaseThePigeon.action,
	// 	permissions: Discord.PermissionFlagsBits.ManageChannels,
	// },
	{
		name: 'create-tag-channel',
		description: 'Create a channel for a given tag',
		action: CreateTagChannel.action,
		permissions: Discord.PermissionFlagsBits.ManageChannels,
		addOptions: CreateTagChannel.addOptions,
	},
	{
		name: 'process-dump',
		description: 'Process messages if gif-dump, as if they were just sent.',
		action: ProcessDump.action,
		permissions: Discord.PermissionFlagsBits.ManageChannels,
		addOptions: ProcessDump.addOptions,
	},
	{
		name: 'backup',
		description: 'Make a backup of the server',
		action: Backup.action,
		permissions: Discord.PermissionFlagsBits.ManageChannels,
	},
	{
		name: 'process-storage',
		description: 'Send to admin non-approved GIFs in storage',
		action: ProcessStorage.action,
		permissions: Discord.PermissionFlagsBits.ManageChannels,
	},
	// {
	// 	name: 'reupload-raw-to-storage',
	// 	description: 'Reuploads raw-gifs to storage',
	// 	action: ReuploadRawToStorage.action,
	// 	permissions: Discord.PermissionFlagsBits.ManageChannels,
	// },
	{
		name: 'manage-all-in-channel',
		description: 'Send all GIFs from a channel to control-room.',
		action: ManageAllInChannel.action,
		permissions: Discord.PermissionFlagsBits.ManageChannels,
		addOptions: ManageAllInChannel.addOptions,
	},
	{
		name: 'healthcheck',
		description: 'Removed duplicates and adds missing messages to tag channels.',
		action: Healthcheck.action,
		permissions: Discord.PermissionFlagsBits.ManageChannels,
		addOptions: Healthcheck.addOptions,
	},
	
	// Refreshing all messages is useful after changing the template of messages from the bot.
	// {
	// 	name: 'refresh',
	// 	description: 'Refresh all GIFs in gif-library and tag channels.',
	// 	action: Refresh.action,
	// 	permissions: Discord.PermissionFlagsBits.ManageChannels,
	// },

	// {
	// 	name: 'temp',
	// 	description: 'Temporary command',
	// 	action: TempCommand.action,
	// 	permissions: Discord.PermissionFlagsBits.ManageChannels,
	// },
	// {
	// 	name: 'add-mp4-tags',
	// 	description: 'Add the tag "mp4" to all MP4s',
	// 	action: AddMp4Tags.action,
	// 	permissions: Discord.PermissionFlagsBits.ManageChannels,
	// },
];
const CONTEXT_COMMANDS = [
	{
		name: 'Manage GIF',
		type: Discord.ApplicationCommandType.Message,
		permissions: Discord.PermissionFlagsBits.ManageChannels,
		action: ManageGif.action,
	},
	// {
	// 	name: 'Add to favourites',
	// 	type: Discord.ApplicationCommandType.Message,
	// 	action: AddToPersonalChannel.action,
	// },
];
const ALL_COMMANDS = [...SLASH_COMMANDS, ...CONTEXT_COMMANDS];

const COMPONENTS = [
	{ customId: 'suggest-tags-button', action: Approved.suggestTagsButtonClicked },
	{ customId: 'suggest-tags-modal', action: Approved.suggestTagsModalSubmitted },
	{ customId: 'admin-reupload', action: AdminReupload.tryReuploadingAgain },
	{ customId: 'admin-manage-approve', action: AdminApprove.confirm },
	{ customId: 'admin-manage-reject', action: AdminApprove.reject },
	{ customId: 'admin-manage-edit', action: AdminApprove.edit },
	{ customId: 'admin-manual-tags-yes', action: AdminEditTags.manageManualTags },
	{ customId: 'admin-manual-tags-no', action: AdminEditTags.dontManageManualTags },
	{ customId: 'admin-edit-tags-modal', action: AdminEditTags.submit },
	{ customId: 'admin-tag-suggestion-select', action: AdminTagsSuggestion.select },
	{ customId: 'admin-tag-suggestion-confirm', action: AdminTagsSuggestion.confirm },
	{ customId: 'admin-tag-suggestion-reject', action: AdminTagsSuggestion.reject },
	{ customId: 'admin-no-gif-warning-confirm', action: AdminNoGifWarning.confirm },
	/* At most 4 select menus for approving GIFs. */
	{ customId: 'admin-approve-category-0', action: AdminApprove.categoryChannelsChosen },
	{ customId: 'admin-approve-category-1', action: AdminApprove.categoryChannelsChosen },
	{ customId: 'admin-approve-category-2', action: AdminApprove.categoryChannelsChosen },
	{ customId: 'admin-approve-category-3', action: AdminApprove.categoryChannelsChosen },
	{ customId: 'add-to-favourites-button', action: AddToPersonalChannel.action },
	{ customId: 'remove-from-favourites-button', action: PersonalChannels.removeButtonClicked },
];

// Register commands in the guild.
const slashCommands = SLASH_COMMANDS.map((c) => {
	const cmd = new Discord.SlashCommandBuilder().setName(c.name).setDescription(c.description).setDefaultMemberPermissions(c.permissions);
	if (c.addOptions) c.addOptions(cmd);
	return cmd.toJSON();
});
const contextCommands = CONTEXT_COMMANDS.map((c) =>
	new Discord.ContextMenuCommandBuilder().setName(c.name).setType(c.type).setDefaultMemberPermissions(c.permissions)
);

const rest = new Discord.REST({ version: '10' }).setToken(BOT_TOKEN);
rest.put(Discord.Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
	body: [...slashCommands, ...contextCommands],
});

// Connect to Discord (via WebSocket, I guess?) and define what happens when some events occur.
// List of events: https://old.discordjs.dev/#/docs/discord.js/main/class/Client
const Intents = Discord.GatewayIntentBits;
const client = new Discord.Client({
	intents: [Intents.Guilds, Intents.GuildMessages, Intents.MessageContent, Intents.GuildMembers],
});
Globals.setClient(client); // We make the "client" variable accessible from every file.
client.once(Discord.Events.ClientReady, clientReadyEvent);
client.on(Discord.Events.InteractionCreate, interactionCreateEvent);
client.on(Discord.Events.MessageCreate, msgCreateEvent);
client.on(Discord.Events.MessageUpdate, msgUpdateEvent);
client.on(Discord.Events.MessageDelete, msgDeleteEvent);
client.login(BOT_TOKEN);

async function clientReadyEvent(client) {
	Globals.refreshChannels();
	await Globals.checkIfGuildIsSetUp();
	if (Globals.isGuildSetUp) await Database.load();
	else console.log('The guild is not set up; the only available command is /release-the-pigeon');
	setInterval(Logs.sendSyncLogs, 5000);
}

const LOADING_MSG = 'The Pigeon took a nap and is now waking up. Please, try again in a minute.';
async function interactionCreateEvent(interaction) {
	if (interaction.guildId !== GUILD_ID) return;
	if (interaction.commandName !== 'release-the-pigeon' && interaction.commandName !== 'backup') {
		if (!Globals.isGuildSetUp) return;
		if (!Database.loaded) {
			await interaction.reply({ content: LOADING_MSG, ephemeral: true });
			return;
		}
	}
	if (interaction.isChatInputCommand() || interaction.isMessageContextMenuCommand()) {
		const c = ALL_COMMANDS.find((c) => c.name === interaction.commandName);
		try {
			await c.action(interaction);
		} catch (e) {
			Logs.syncWarning(`Error while processing command ${interaction.commandName}`, e);
		}
	} else {
		const c = COMPONENTS.find((c) => c.customId === interaction.customId);
		try {
			await c.action(interaction);
		} catch (e) {
			Logs.syncWarning(`Error while processing interaction ${interaction.customId}`, e);
		}
	}
}

async function msgCreateEvent(msg) {
	if (msg.guildId !== GUILD_ID) return;
	if (!Globals.isGuildSetUp || !Database.loaded) return;

	try {
		Database.msgCreated(msg);
		// We react to our own messages. Be careful.
		if (msg.channelId === Globals.storage.id) await Events.storageMsgCreated(msg);
		if (msg.channelId === Globals.approved.id || msg.channelId === Globals.approvedMP4.id) await Events.approvedMsgCreated(msg);
		if (msg.author.bot) return;
		if (msg.channelId === Globals.dump.id) await Events.dumpMsgCreated(msg);
	} catch (e) {
		Logs.syncWarning(`Error while processing a new message`, e);
	}
}

async function msgUpdateEvent(oldMsg, newMsg) {
	if (newMsg.guildId !== GUILD_ID) return;
	if (!Globals.isGuildSetUp || !Database.loaded) return;

	try {
		Database.msgUpdated(oldMsg, newMsg);
		if (oldMsg.channelId === Globals.approved.id || oldMsg.channelId === Globals.approvedMP4.id) await Events.approvedMsgChanged(oldMsg, newMsg);
	} catch (e) {
		Logs.syncWarning(`Error while processing an updated message`, e);
	}
}

async function msgDeleteEvent(msg) {
	if (msg.guildId !== GUILD_ID) return;
	if (!Globals.isGuildSetUp || !Database.loaded) return;

	try {
		Database.msgDeleted(msg);
		if (msg.channelId === Globals.storage.id) await Events.storageMsgDeleted(msg);
		else if (msg.channelId === Globals.approved.id || msg.channelId === Globals.approvedMP4.id) await Events.approvedMsgDeleted(msg);
	} catch (e) {
		Logs.syncWarning(`Error while processing a deleted message`, e);
	}
}
