const { Node, mergeAttributes } = require('@tiptap/core');

module.exports = Node.create({
  name: 'listItem',

  content: '(paragraph|bulletList)+',
  draggable: true,

  parseHTML () {
    return [
      {
        tag: 'li[data-type="listItem"]'
      }
    ];
  },

  renderHTML ({ HTMLAttributes }) {
    return ['li', mergeAttributes(HTMLAttributes, { 'data-type': 'listItem' }), 0];
  },

  addKeyboardShortcuts () {
    return {
      Enter: () => this.editor.commands.splitListItem('listItem'),
      Tab: () => this.editor.commands.sinkListItem('listItem'),
      'Shift-Tab': () => this.editor.commands.liftListItem('listItem')
    };
  }
});
