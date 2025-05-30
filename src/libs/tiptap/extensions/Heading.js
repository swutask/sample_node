const { Node, mergeAttributes } = require('@tiptap/core');

module.exports = Node.create({
  name: 'heading',

  addOptions () {
    return {
      levels: [1, 2, 3, 4, 5, 6],
      HTMLAttributes: {}
    };
  },

  content: 'inline*',
  group: 'block',
  defining: true,

  addAttributes () {
    return {
      level: {
        default: 1,
        rendered: false
      },
      indent: {
        default: null
      }
    };
  },

  parseHTML () {
    return this.options.levels
      .map((level) => ({
        tag: `h${level}`,
        attrs: { level }
      }));
  },

  renderHTML ({ node, HTMLAttributes }) {
    const hasLevel = this.options.levels.includes(node.attrs.level);
    const level = hasLevel
      ? node.attrs.level
      : this.options.levels[0];

    return [`h${level}`, mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands () {
    return {
      setHeading: (attributes) => ({ commands }) => {
        if (!this.options.levels.includes(attributes.level)) {
          return false;
        }

        return commands.setNode('heading', attributes);
      },

      toggleHeading: (attributes) => ({ commands }) => {
        if (!this.options.levels.includes(attributes.level)) {
          return false;
        }

        return commands.toggleNode('heading', 'paragraph', attributes);
      }
    };
  },

  addKeyboardShortcuts () {
    return this.options.levels.reduce((items, level) => ({
      ...items,
      ...{
        [`Mod-Alt-${level}`]: () => this.editor.commands.toggleHeading({ level })
      }
    }), {});
  }
});
