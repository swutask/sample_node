const { Node } = require('@tiptap/core');

module.exports = Node.create({
  name: 'mention',

  addOptions () {
    return {
      matcher: {
        char: '@',
        allowSpaces: true,
        startOfLine: false
      },
      mentionClass: 'mention'
    };
  },

  addAttributes () {
    return {
      href: {
        default: null
      },
      title: {
        default: 'Getting started'
      },
      label: {
        default: null
      }
    };
  },

  group: 'inline',
  inline: true,
  selectable: false,
  atom: true,

  parseHTML () {
    return [
      {
        tag: 'button.mention'
      }
    ];
  },

  renderHTML ({ node }) {
    return [
      'button',
      {
        class: this.options.mentionClass,
        href: node.attrs.href,
        title: node.attrs.title
      },
      `${this.options.matcher.char}${node.attrs.label}`
    ];
  },

  addNodeView () {
    return ({ node }) => {
      const open = () => {
      };

      const dom = document.createElement('button');

      dom.classList.add('mention');
      dom.setAttribute('title', node.attrs.title);
      dom.addEventListener('click', open);
      dom.innerHTML = `${this.options.matcher.char}${node.attrs.label}`;

      return {
        dom,
        destroy () {
          dom.removeEventListener('click', open);
        }
      };
    };
  }
});
