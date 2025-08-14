import * as Bare from './gifBare.js';
import * as EmbedAuthorTagsButton from './gifEmbedAuthorTagsButton.js';
import * as EmbedAuthorTagsButtonFav from './gifEmbedAuthorTagsButtonFav.js';
import * as UrlAuthorTagsButton from './gifUrlAuthorTagsButton.js';
import * as UrlAuthorTagsButtonFav from './gifUrlAuthorTagsButtonFav.js';
import * as Utils from '../utils.js';

const views = [Bare, EmbedAuthorTagsButton, UrlAuthorTagsButton, EmbedAuthorTagsButtonFav, UrlAuthorTagsButtonFav];

export function getDataFromMsg(msg) {
	return Utils.getDataFromViews(msg, views);
}
