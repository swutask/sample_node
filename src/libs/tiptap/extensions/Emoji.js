const { Node } = require('@tiptap/core');

module.exports = Node.create({
  name: 'emoji',

  addOptions () {
    return {
      matcher: {
        char: ':',
        allowSpaces: true,
        startOfLine: false
      }
    };
  },

  addAttributes () {
    return {
      data: {
        default: null
      }
    };
  },

  inline: true,
  selectable: false,
  group: 'inline',

  parseHTML () {
    return [
      {
        tag: 'span[type="emoji"]',
        getAttrs: dom => ({
          data: dom.getAttribute('data')
        })
      }
    ];
  },

  renderHTML ({ node }) {
    return ['span', { type: 'emoji', data: node.attrs.data }, `${node.attrs.data}`];
  },

  addNodeView () {
    return ({ node }) => {
      const dom = document.createElement('span');

      dom.setAttribute('data', node.attrs.data);
      dom.setAttribute('type', 'emoji');
      dom.innerHTML = node.attrs.data;

      return { dom };
    };
  }
});
