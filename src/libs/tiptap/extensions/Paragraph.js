const { Node, mergeAttributes } = require('@tiptap/core');

module.exports = Node.create({
  name: 'paragraph',

  addAttributes () {
    return {
      indent: {
        default: null
      }
    };
  },

  group: 'block',

  content: 'inline*',

  parseHTML () {
    return [
      { tag: 'p' }
    ];
  },

  renderHTML ({ HTMLAttributes }) {
    return ['p', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands () {
    return {
      setParagraph: () => ({ commands }) => {
        return commands.toggleNode('paragraph', 'paragraph');
      }
    };
  },

  addKeyboardShortcuts () {
    return {
      'Mod-Alt-0': () => this.editor.commands.setParagraph()
    };
  }
});
