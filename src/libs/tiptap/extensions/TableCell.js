const { Node, mergeAttributes } = require('@tiptap/core');

module.exports = Node.create({
  name: 'tableCell',

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

  tableRole: 'cell',

  isolating: true,

  parseHTML () {
    return [
      { tag: 'td' }
    ];
  },

  renderHTML ({ HTMLAttributes }) {
    return ['td', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  }
});
