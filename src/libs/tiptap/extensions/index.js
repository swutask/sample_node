const ColorBlock = require('./ColorBlock');
const LocalLink = require('./LocalLink');
const Mention = require('./Mention');
const Emoji = require('./Emoji');
const Image = require('./Image');
const File = require('./File');
const Gif = require('./Gif');
const ListItem = require('./ListItem');
const TaskItem = require('./TaskItem');
const TaskList = require('./TaskList');
const TextColor = require('./TextColor');
// const Title = require('./Title');
const Document = require('./Document');
const Doc = require('./Doc');
const CommentMark = require('./CommentMark');
const Table = require('./Table');
const TableCell = require('./TableCell');
const TableHeader = require('./TableHeader');
const Indent = require('./Indent');
const Paragraph = require('./Paragraph');
const Heading = require('./Heading');
const OrderedList = require('./OrderedList');
const OrderedListItem = require('./OrderedListItem');

const { Youtube } = require('@tiptap/extension-youtube');
const { BulletList } = require('@tiptap/extension-bullet-list');
const { Blockquote } = require('@tiptap/extension-blockquote');
const { Bold } = require('@tiptap/extension-bold');
const { HardBreak } = require('@tiptap/extension-hard-break');
const { HorizontalRule } = require('@tiptap/extension-horizontal-rule');
const { Italic } = require('@tiptap/extension-italic');
const { Link } = require('@tiptap/extension-link');
const { Highlight } = require('@tiptap/extension-highlight');
const { Underline } = require('@tiptap/extension-underline');
const { Text } = require('@tiptap/extension-text');
const { TableRow } = require('@tiptap/extension-table-row');
const { CodeBlockLowlight } = require('@tiptap/extension-code-block-lowlight');

const pageExtensions = [
  CommentMark,
  Indent,
  Paragraph,
  Text,
  Bold,
  Italic,
  CodeBlockLowlight,
  HardBreak,
  HorizontalRule,
  BulletList,
  OrderedList,
  OrderedListItem,
  Highlight,
  Blockquote,
  Youtube,
  Heading,
  TextColor,
  ColorBlock,
  Underline,
  ListItem,
  Link,
  LocalLink,
  Mention,
  Emoji,
  Image,
  File,
  Gif,
  TaskItem,
  TaskList,
  // Title,
  Document,
  Table,
  TableRow,
  TableHeader,
  TableCell
];

const depthPageExtensions = [
  Indent,
  Paragraph,
  Text,
  Bold,
  Italic,
  CodeBlockLowlight,
  HardBreak,
  HorizontalRule,
  BulletList,
  OrderedList,
  OrderedListItem,
  Highlight,
  Doc,
  Youtube,
  // custom extensions
  Blockquote,
  Heading,
  TextColor,
  // TrailingNode,
  ColorBlock,
  Underline,
  ListItem,
  Link,
  LocalLink,
  Mention,
  Emoji,
  Image,
  File,
  Gif,
  TaskItem,
  TaskList,
  Table,
  TableRow,
  TableHeader,
  TableCell
];

module.exports = {
  pageExtensions,
  depthPageExtensions
};
