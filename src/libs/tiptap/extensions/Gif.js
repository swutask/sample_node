const { Node } = require('@tiptap/core');

module.exports = Node.create({
  name: 'Gif',

  inline: true,
  content: 'inline*',
  group: 'inline',
  marks: '',

  addAttributes () {
    return {
      src: {
        default: null
      },
      style: {
        default: 'display: inline-block; max-width: 200px; width: 100%; padding: 2px; border-radius: 8px;'
      }
    };
  },

  parseHTML () {
    return [
      {
        tag: 'span[type="gif"]',
        getAttrs: dom => ({
          style: dom.getAttribute('style'),
          src: dom.getAttribute('src')
        })
      }
    ];
  },

  renderHTML ({ node }) {
    return [
      'span', { ...node.attrs, type: 'gif', contenteditable: 'false' },
      ['img', node.attrs]
    ];
  },

  addCommands () {
    return {
      setGif: (options) => ({ tr, dispatch }) => {
        const { selection } = tr;

        const node = this.type.create({
          id: options.id,
          src: options.url
        });

        if (dispatch) {
          tr.replaceRangeWith(selection.from, selection.to, node);
        }

        return true;
      }
    };
  }
});
