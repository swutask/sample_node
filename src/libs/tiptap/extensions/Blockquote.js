const { Node, mergeAttributes } = require('@tiptap/core');

module.exports = Node.create({
  name: 'blockquote',

  content: 'block*',
  group: 'block',
  defining: true,

  addAttributes () {
    return {
      indent: {
        default: null
      }
    };
  },

  parseHTML () {
    return [
      { tag: 'blockquote' }
    ];
  },

  renderHTML ({ HTMLAttributes }) {
    return ['blockquote', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands () {
    return {
      setBlockquote: () => ({ commands }) => {
        return commands.wrapIn('blockquote');
      },
      toggleBlockquote: () => ({ commands }) => {
        return commands.toggleWrap('blockquote');
      },
      unsetBlockquote: () => ({ commands }) => {
        return commands.lift('blockquote');
      }
    };
  },

  addKeyboardShortcuts () {
    return {
      'Mod-Shift-b': () => this.editor.commands.toggleBlockquote()
    };
  }
});
