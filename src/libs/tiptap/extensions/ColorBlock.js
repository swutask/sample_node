const { Node } = require('@tiptap/core');

module.exports = Node.create({
  name: 'colorBlock',

  content: 'text*',
  code: true,
  group: 'block',
  defining: true,

  addAttributes () {
    return {
      style: {
        default: null
      }
    };
  },

  parseHTML () {
    return [{
      tag: 'div[type="block-color"]',
      preserveWhitespace: 'full',
      getAttrs: dom => ({ style: dom.getAttribute('style') })
    }];
  },

  renderHTML ({ node }) {
    return [
      'div', { type: 'block-color', style: node.attrs.style, class: 'color-block' },
      0
    ];
  },

  addCommands () {
    return {
      setColorBlock: attributes => ({ commands }) => {
        return commands.setNode('colorBlock', attributes);
      }
    };
  }
});
