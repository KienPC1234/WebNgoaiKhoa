/**
 * @license Copyright (c) 2003-2020, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

// The editor creator to use.
import ClassicEditorBase from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';

import Essentials from '@ckeditor/ckeditor5-essentials/src/essentials';
// Removed CKFinder/CloudServices dependent upload adapter to avoid requiring CloudServices
// We use a custom FileRepository upload adapter (attached in React component) instead.
import Autoformat from '@ckeditor/ckeditor5-autoformat/src/autoformat';
import Bold from '@ckeditor/ckeditor5-basic-styles/src/bold';
import Code from '@ckeditor/ckeditor5-basic-styles/src/code';
import Italic from '@ckeditor/ckeditor5-basic-styles/src/italic';
import RemoveFormat from '@ckeditor/ckeditor5-remove-format/src/removeformat';
import Strikethrough from '@ckeditor/ckeditor5-basic-styles/src/strikethrough';
import Subscript from '@ckeditor/ckeditor5-basic-styles/src/subscript';
import Superscript from '@ckeditor/ckeditor5-basic-styles/src/superscript';
import Underline from '@ckeditor/ckeditor5-basic-styles/src/underline';
import BlockQuote from '@ckeditor/ckeditor5-block-quote/src/blockquote';
import Heading from '@ckeditor/ckeditor5-heading/src/heading';
import Image from '@ckeditor/ckeditor5-image/src/image';
import ImageCaption from '@ckeditor/ckeditor5-image/src/imagecaption';
import ImageStyle from '@ckeditor/ckeditor5-image/src/imagestyle';
import ImageToolbar from '@ckeditor/ckeditor5-image/src/imagetoolbar';
import ImageUpload from '@ckeditor/ckeditor5-image/src/imageupload';
import Indent from '@ckeditor/ckeditor5-indent/src/indent';
import Link from '@ckeditor/ckeditor5-link/src/link';
import List from '@ckeditor/ckeditor5-list/src/list';
import MediaEmbed from '@ckeditor/ckeditor5-media-embed/src/mediaembed';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import PasteFromOffice from '@ckeditor/ckeditor5-paste-from-office/src/pastefromoffice';
import Table from '@ckeditor/ckeditor5-table/src/table';
import TableToolbar from '@ckeditor/ckeditor5-table/src/tabletoolbar';
import TextTransformation from '@ckeditor/ckeditor5-typing/src/texttransformation';
import Mention from '@ckeditor/ckeditor5-mention/src/mention';
import Font from '@ckeditor/ckeditor5-font/src/font';
import FontFamily from '@ckeditor/ckeditor5-font/src/fontfamily';
import FontSize from '@ckeditor/ckeditor5-font/src/fontsize';
import FontColor from '@ckeditor/ckeditor5-font/src/fontcolor';
import FontBackgroundColor from '@ckeditor/ckeditor5-font/src/fontbackgroundcolor';
import Alignment from '@ckeditor/ckeditor5-alignment/src/alignment';

export default class ClassicEditor extends ClassicEditorBase {}

// Plugins to include in the build.
ClassicEditor.builtinPlugins = [
	Essentials,
	Autoformat,
	Alignment,
	Bold,
	Code,
	Italic,
	RemoveFormat,
	Strikethrough,
	Subscript,
	Superscript,
	Underline,
	BlockQuote,
	Heading,
	Image,
	ImageCaption,
	ImageStyle,
	ImageToolbar,
	// We keep ImageUpload but remove CKFinder/EasyImage which bring CloudServices dependency.
	ImageUpload,
	Indent,
	Link,
	List,
	MediaEmbed,
	Paragraph,
	PasteFromOffice,
	Table,
	TableToolbar,
	TextTransformation,
	Mention,
	// Font feature plugins
	Font,
	FontFamily,
	FontSize,
	FontColor,
	FontBackgroundColor
];

// Editor configuration.
ClassicEditor.defaultConfig = {
	toolbar: {
		items: [
			'heading',
			'|',
			'fontFamily',
			'fontSize',
			'fontColor',
			'fontBackgroundColor',
			'|',
			'bold',
			'italic',
			'underline',
			'strikethrough',
			'code',
			'subscript',
			'superscript',
			'removeFormat',
			'|',
			'alignment',
			'link',
			'bulletedList',
			'numberedList',
			'|',
			'indent',
			'outdent',
			'|',
			'imageUpload',
			'blockQuote',
			'insertTable',
			'mediaEmbed',
			'undo',
			'redo'
		]
	},
	image: {
		toolbar: [
			'imageStyle:full',
			'imageStyle:side',
			'|',
			'imageTextAlternative'
		]
	},
	fontFamily: {
		options: [
			'default',
			'Aptos, Calibri, "Segoe UI", Arial, sans-serif',
			'Aptos Display, Aptos, "Segoe UI", Arial, sans-serif',
			'Calibri, Candara, Segoe, "Segoe UI", Optima, Arial, sans-serif',
			'Arial, "Helvetica Neue", Helvetica, sans-serif',
			'Arial Black, Gadget, sans-serif',
			'Bahnschrift, "Segoe UI", Arial, sans-serif',
			'Cambria, Georgia, serif',
			'Cambria Math, Cambria, "Times New Roman", serif',
			'Candara, Calibri, Segoe, "Segoe UI", sans-serif',
			'Century Gothic, CenturyGothic, AppleGothic, sans-serif',
			'Century Schoolbook, Georgia, serif',
			'Charter, "Bitstream Charter", "Sitka Text", serif',
			'Copperplate, "Copperplate Gothic Light", fantasy',
			'Comic Sans MS, Comic Sans, cursive',
			'Consolas, "Lucida Console", Monaco, monospace',
			'Constantia, Georgia, serif',
			'Corbel, "Segoe UI", Arial, sans-serif',
			'Didot, "Bodoni MT", "Times New Roman", serif',
			'Fira Sans, "Segoe UI", Arial, sans-serif',
			'Fira Code, Consolas, "Courier New", monospace',
			'Frank Ruhl Libre, Georgia, serif',
			'Courier New, Courier, monospace',
			'Franklin Gothic Medium, "Arial Narrow", Arial, sans-serif',
			'Gabarito, "Segoe UI", Arial, sans-serif',
			'Garamond, "Times New Roman", serif',
			'Georgia, "Times New Roman", Times, serif',
			'Gill Sans, GillSans, Calibri, "Trebuchet MS", sans-serif',
			'Helvetica, "Helvetica Neue", Arial, sans-serif',
			'IBM Plex Sans, "Segoe UI", Arial, sans-serif',
			'IBM Plex Serif, Georgia, serif',
			'IBM Plex Mono, Consolas, "Courier New", monospace',
			'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
			'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
			'Josefin Sans, "Segoe UI", Arial, sans-serif',
			'Jost, "Segoe UI", Arial, sans-serif',
			'Lato, "Segoe UI", Arial, sans-serif',
			'Libre Baskerville, Georgia, serif',
			'Libre Franklin, "Segoe UI", Arial, sans-serif',
			'Lora, Georgia, serif',
			'Lucida Sans Unicode, Lucida Grande, sans-serif',
			'Manrope, "Segoe UI", Arial, sans-serif',
			'Merriweather, Georgia, serif',
			'Merriweather Sans, "Segoe UI", Arial, sans-serif',
			'Montserrat, Arial, Helvetica, sans-serif',
			'Mulish, "Segoe UI", Arial, sans-serif',
			'Nunito, "Segoe UI", Arial, sans-serif',
			'Nunito Sans, "Segoe UI", Arial, sans-serif',
			'Noto Sans, Arial, Helvetica, sans-serif',
			'Noto Serif, Georgia, serif',
			'Open Sans, "Segoe UI", Arial, sans-serif',
			'Palatino Linotype, Book Antiqua, Palatino, serif',
			'PT Sans, "Segoe UI", Arial, sans-serif',
			'PT Serif, Georgia, serif',
			'Poppins, Arial, Helvetica, sans-serif',
			'Public Sans, "Segoe UI", Arial, sans-serif',
			'Quicksand, "Segoe UI", Arial, sans-serif',
			'Raleway, "Segoe UI", Arial, sans-serif',
			'Roboto Condensed, Roboto, Arial, sans-serif',
			'Roboto Slab, "Times New Roman", serif',
			'Roboto, Arial, Helvetica, sans-serif',
			'Sora, "Segoe UI", Arial, sans-serif',
			'Segoe UI, Segoe, Tahoma, Geneva, Verdana, sans-serif',
			'Sitka Text, Cambria, Georgia, serif',
			'Spectral, Georgia, serif',
			'Source Sans 3, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
			'Source Sans Pro, Arial, Helvetica, sans-serif',
			'Space Grotesk, "Segoe UI", Arial, sans-serif',
			'Titillium Web, "Segoe UI", Arial, sans-serif',
			'Tahoma, Geneva, sans-serif',
			'Times New Roman, Times, serif',
			'Ubuntu, "Segoe UI", Arial, sans-serif',
			'Trebuchet MS, Helvetica, sans-serif',
			'Vollkorn, Georgia, serif',
			'Work Sans, "Segoe UI", Arial, sans-serif',
			'Abhaya Libre, "Times New Roman", serif',
			'Alegreya, Georgia, serif',
			'Alegreya Sans, "Segoe UI", Arial, sans-serif',
			'Alfa Slab One, Georgia, serif',
			'Archivo, "Segoe UI", Arial, sans-serif',
			'Archivo Narrow, "Segoe UI", Arial, sans-serif',
			'Arimo, Arial, sans-serif',
			'Asap, "Segoe UI", Arial, sans-serif',
			'Asap Condensed, "Segoe UI", Arial, sans-serif',
			'Assistant, "Segoe UI", Arial, sans-serif',
			'Barlow, "Segoe UI", Arial, sans-serif',
			'Barlow Condensed, "Segoe UI", Arial, sans-serif',
			'Bebas Neue, Impact, sans-serif',
			'Bitter, Georgia, serif',
			'Bricolage Grotesque, "Segoe UI", Arial, sans-serif',
			'Cabin, "Segoe UI", Arial, sans-serif',
			'Cairo, "Segoe UI", Arial, sans-serif',
			'Cardo, Georgia, serif',
			'Chivo, "Segoe UI", Arial, sans-serif',
			'Crimson Pro, Georgia, serif',
			'DM Sans, "Segoe UI", Arial, sans-serif',
			'DM Serif Display, Georgia, serif',
			'Domine, Georgia, serif',
			'Epilogue, "Segoe UI", Arial, sans-serif',
			'Exo 2, "Segoe UI", Arial, sans-serif',
			'Figtree, "Segoe UI", Arial, sans-serif',
			'Fraunces, Georgia, serif',
			'Heebo, "Segoe UI", Arial, sans-serif',
			'Hind, "Segoe UI", Arial, sans-serif',
			'Inconsolata, Consolas, "Courier New", monospace',
			'Instrument Sans, "Segoe UI", Arial, sans-serif',
			'Karla, "Segoe UI", Arial, sans-serif',
			'Lexend, "Segoe UI", Arial, sans-serif',
			'Libre Caslon Text, Georgia, serif',
			'M PLUS Rounded 1c, "Segoe UI", Arial, sans-serif',
			'Mada, "Segoe UI", Arial, sans-serif',
			'Martel, Georgia, serif',
			'Newsreader, Georgia, serif',
			'Outfit, "Segoe UI", Arial, sans-serif',
			'Overpass, "Segoe UI", Arial, sans-serif',
			'Oxygen, "Segoe UI", Arial, sans-serif',
			'Playfair Display, Georgia, serif',
			'Plus Jakarta Sans, "Segoe UI", Arial, sans-serif',
			'Prompt, "Segoe UI", Arial, sans-serif',
			'Red Hat Display, "Segoe UI", Arial, sans-serif',
			'Rokkitt, Georgia, serif',
			'Rubik, "Segoe UI", Arial, sans-serif',
			'Schibsted Grotesk, "Segoe UI", Arial, sans-serif',
			'Teko, "Segoe UI", Arial, sans-serif',
			'Urbanist, "Segoe UI", Arial, sans-serif',
			'Be Vietnam, "Segoe UI", Arial, sans-serif',
			'Be Vietnam Pro, "Segoe UI", Arial, sans-serif',
			'Tinos, Georgia, serif',
			'M PLUS 1p, "Segoe UI", Arial, sans-serif',
			'Gentium Basic, Georgia, serif',
			'Gentium Book Basic, Georgia, serif',
			'EB Garamond, Georgia, serif',
			'Droid Sans, Arial, sans-serif',
			'Mukta, "Segoe UI", Arial, sans-serif',
			'Merriweather Sans, "Segoe UI", Arial, sans-serif',
			'Verdana, Geneva, sans-serif'
		],
		supportAllValues: true
	},
	fontSize: {
		options: [ '10px','11px','12px','13px','14px','15px','16px','18px','20px','22px','24px','28px','32px','36px','48px' ],
		supportAllValues: true
	},
	alignment: {
		options: [ 'left', 'center', 'right', 'justify' ]
	},
	table: {
		contentToolbar: [
			'tableColumn',
			'tableRow',
			'mergeTableCells'
		]
	},
	// This value must be kept in sync with the language defined in webpack.config.js.
	language: 'en'
};
