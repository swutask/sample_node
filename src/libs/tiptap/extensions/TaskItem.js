const { Node, mergeAttributes } = require('@tiptap/core');

module.exports = Node.create({
  name: 'todo_item',

  addOptions () {
    return {
      HTMLAttributes: {
        class: 'todo_item'
      }
    };
  },

  content: '(paragraph|todo_list)+',
  draggable: true,

  addAttributes () {
    return {
      done: {
        default: false,
        parseHTML: element => element.getAttribute('data-done') === 'true',
        renderHTML: attributes => ({
          'data-done': attributes.done
        })
      }
    };
  },

  parseHTML () {
    return [
      {
        tag: 'li[data-type="todo_item"]'
      }
    ];
  },

  renderHTML ({ HTMLAttributes }) {
    return ['li', mergeAttributes(HTMLAttributes, { 'data-type': 'todo_item' }), 0];
  },

  addKeyboardShortcuts () {
    return {
      Enter: () => this.editor.commands.splitListItem('todo_item'),
      Tab: () => this.editor.commands.sinkListItem('todo_item'),
      'Shift-Tab': () => this.editor.commands.liftListItem('todo_item')
    };
  }
});
