const { Mark, mergeAttributes } = require('@tiptap/core');

const TextColor = Mark.create({
  name: 'textColor',

  addAttributes () {
    return {
      color: {
        default: null,
        parseHTML: element => {
          return {
            color: element.style.color
          };
        },
        renderHTML: attributes => {
          if (!attributes.color) {
            return {};
          }

          return {
            style: `color: ${attributes.color}`
          };
        }
      }
    };
  },

  parseHTML () {
    return [
      {
        tag: 'span[type="color"]'
      }
    ];
  },

  renderHTML ({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { type: 'color' }), 0];
  },

  addCommands () {
    return {
      setTextColor: attributes => ({ commands }) => {
        return commands.setMark('textColor', attributes);
      },

      unsetTextColor: () => ({ commands }) => {
        return commands.unsetMark('textColor');
      }
    };
  }
});

module.exports = TextColor;
