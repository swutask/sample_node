const { Node } = require('@tiptap/core');

module.exports = Node.create({
  name: 'title',

  content: 'inline*',

  parseHTML () {
    return [
      {
        tag: 'h1.title'
      }
    ];
  },

  renderHTML () {
    return ['h1', { class: 'title' }, 0];
  }
});
