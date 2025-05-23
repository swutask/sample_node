const { Node, mergeAttributes } = require('@tiptap/core');

module.exports = Node.create({
  name: 'tableHeader',

  content: 'block+',

  addAttributes () {
    return {
      colspan: {
        default: 1
      },
      rowspan: {
        default: 1
      },
      colwidth: {
        default: null,
        parseHTML: element => {
          const colwidth = element.getAttribute('colwidth');
          const value = colwidth ? [parseInt(colwidth)] : null;
          return {
            colwidth: value
          };
        }
      },
      style: {
        default: ''
      }
    };
  },

  tableRole: 'header_cell',

  isolating: true,

  parseHTML () {
    return [
      { tag: 'th' }
    ];
  },

  renderHTML ({ HTMLAttributes }) {
    return ['th', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  }
});
