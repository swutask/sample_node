const { Node, mergeAttributes } = require('@tiptap/core');

module.exports = Node.create({
  name: 'orderedListItem',

  addOptions () {
    return {
      isEvent: false,
      HTMLAttributes: {}
    };
  },

  content: 'paragraph block*',
  draggable: true,
  defining: true,

  addAttributes () {
    return {
      isEvent: {
        default: this.options.isEvent
      },
      class: {
        default: 'ordered-list-item'
      }
    };
  },

  parseHTML () {
    return [
      {
        tag: 'li[data-type="orderedListItem"]',
        getAttrs: dom => ({
          class: dom.getAttribute('class')
        })
      }
    ];
  },

  renderHTML ({ HTMLAttributes }) {
    return [
      'li',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      ['div', { class: 'ordered-list-item-content' }, 0]
    ];
  },

  addKeyboardShortcuts () {
    return {
      Enter: () => this.editor.commands.splitListItem('orderedListItem'),
      Tab: () => this.editor.commands.sinkListItem('orderedListItem'),
      'Shift-Tab': () => this.editor.commands.liftListItem('orderedListItem')
    };
  }
});
