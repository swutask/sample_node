const { Node, mergeAttributes } = require('@tiptap/core');

module.exports = Node.create({
  name: 'orderedList',

  group: 'block list',

  content: 'orderedListItem+',

  addAttributes () {
    return {
      start: {
        default: 1,
        parseHTML: element => ({
          start: element.hasAttribute('start')
            ? parseInt(element.getAttribute('start') || '', 10)
            : 1
        })
      }
    };
  },

  parseHTML () {
    return [
      {
        tag: 'ol'
      }
    ];
  },

  renderHTML ({ HTMLAttributes }) {
    const { start, ...attributesWithoutStart } = HTMLAttributes;

    return start === 1
      ? ['ol', mergeAttributes(this.options.HTMLAttributes, attributesWithoutStart), 0]
      : ['ol', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands () {
    return {
      toggleOrderedList: () => ({ commands }) => {
        return commands.toggleList('orderedList', 'listItem');
      }
    };
  },

  addKeyboardShortcuts () {
    return {
      'Mod-Shift-7': () => this.editor.commands.toggleOrderedList()
    };
  }
});
