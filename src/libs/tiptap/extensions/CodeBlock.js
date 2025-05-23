const { Node } = require('@tiptap/core');

module.exports = Node.create({
  name: 'codeBlock',

  content: 'text*',
  marks: '',
  group: 'block',
  atom: true,
  code: true,
  defining: true,
  selectable: false,

  addAttributes () {
    return {
      language: {
        default: null,
        parseHTML: element => {
          const language = element.firstElementChild?.getAttribute('data-lang');

          if (!language) {
            return null;
          }

          return {
            language: language
          };
        },
        renderHTML: attributes => {
          if (!attributes.language) {
            return null;
          }

          return {
            'data-lang': attributes.language
          };
        }
      }
    };
  },

  parseHTML () {
    return [
      {
        tag: 'pre',
        preserveWhitespace: 'full'
      }
    ];
  },

  renderHTML ({ HTMLAttributes }) {
    return ['pre', this.options.HTMLAttributes, ['code', HTMLAttributes, 0]];
  },

  addCommands () {
    return {
      setCodeBlock: attributes => ({ commands }) => {
        return commands.setNode('codeBlock', attributes);
      },

      toggleCodeBlock: attributes => ({ commands }) => {
        return commands.toggleNode('codeBlock', 'paragraph', attributes);
      }
    };
  }
});
