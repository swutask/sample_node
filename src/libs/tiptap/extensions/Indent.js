const { Mark, mergeAttributes } = require('@tiptap/core');

const Indent = Mark.create({
  name: 'indent',
  inclusive: false,

  addAttributes () {
    return {
      indent: {
        default: 0
      }
    };
  },
  parseHTML () {
    return [
      {
        tag: 'span[type="indent"]'
      }
    ];
  },
  renderHTML ({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { type: 'indent' }), 0];
  },
  addKeyboardShortcuts () {
    return {
      Tab: () => {
        const { state } = this.editor;
        let nodes = [];

        state.doc.nodesBetween(state.selection.from, state.selection.to, (node) => {
          nodes = [...nodes, node];
        });

        const deniedTypeName = ['bulletList', 'listItem', 'todo_list', 'todo_item'];
        const isDenied = nodes.reverse().some(nodeItem => deniedTypeName.includes(nodeItem.type.name));

        if (isDenied) return;

        this.editor
          .chain()
          .focus()
          .setSelectionContent()
          .setIndent(1)
          .setCursosAtEnd()
          .run();
        return true;
      },
      'Shift-Tab': () => {
        this.editor.chain()
          .focus()
          .setSelectionContent()
          .setIndent(-1)
          .setCursosAtEnd()
          .run();
        return true;
      }
    };
  }
});

module.exports = Indent;
