const { Node, mergeAttributes } = require('@tiptap/core');

module.exports = Node.create({
  name: 'table',

  addOptions () {
    return {
      HTMLAttributes: {},
      handleWidth: 5,
      cellMinWidth: 25,
      lastColumnResizable: true,
      allowTableNodeSelection: false
    };
  },

  addAttributes () {
    return {
      class: {
        default: ''
      }
    };
  },

  content: 'tableRow+',
  tableRole: 'table',
  isolating: true,
  group: 'block',

  parseHTML () {
    return [{
      tag: 'table',
      getAttrs: dom => {
        return { class: dom.getAttribute('class') };
      }
    }];
  },

  renderHTML ({ HTMLAttributes }) {
    return ['table', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), ['tbody', 0]];
  }
});
