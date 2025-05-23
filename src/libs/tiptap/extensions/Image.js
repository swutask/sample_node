const { Node } = require('@tiptap/core');

const setAttr = (attrs, name, value) => {
  const result = {};
  for (const prop in attrs) result[prop] = attrs[prop];
  result[name] = value;
  return result;
};

module.exports = Node.create({
  name: 'image',

  addOptions () {
    return {
      uploadFunc: null,
      HTMLAttributes: {}
    };
  },

  inline: true,
  content: 'inline*',
  group: 'inline',
  draggable: true,
  selectable: false,
  marks: '',

  addAttributes () {
    return {
      src: {
        default: null
      },
      id: {
        default: null
      },
      style: {
        default: 'width: 350px; position: relative; display: inline-block; line-height: 0; vertical-align: text-bottom; max-width: 98%'
      },
      class: {
        default: ''
      },
      imageLink: {
        default: null
      },
      imageComment: {
        default: null
      }
    };
  },

  parseHTML () {
    return [
      {
        tag: 'span[type="image"]',
        getAttrs: dom => ({
          style: dom.getAttribute('style'),
          src: dom.getAttribute('src'),
          id: dom.getAttribute('id'),
          class: dom.getAttribute('class'),
          imageLink: dom.getAttribute('imageLink'),
          imageComment: dom.getAttribute('imageComment'),
          imageAlign: dom.getAttribute('imageAlign')
        })
      }
    ];
  },

  renderHTML ({ node }) {
    return [
      'span', { type: 'image', ...node.attrs, contenteditable: 'false' },
      ['span', { contenteditable: 'false' }],
      ['span', { contenteditable: 'false' }],
      ['span', { contenteditable: 'false' }],
      ['img', node.attrs]
    ];
  },

  addCommands () {
    return {
      setImage: (options) => ({ tr, dispatch }) => {
        const { selection } = tr;

        const node = this.type.create({
          id: options.id,
          src: options.url
        });

        if (dispatch) {
          tr.replaceRangeWith(selection.from, selection.to, node);
        }

        return true;
      },

      deleteImage: (pos) => ({ state, dispatch, tr }) => {
        const node = state.doc.nodeAt(pos);

        if (node?.type.name === 'image') {
          dispatch(tr.delete(pos, pos + 1));
          return true;
        }

        return false;
      },

      setImageBoxShadow: (value, pos) => ({ state, dispatch }) => {
        const node = state.doc.nodeAt(pos);

        if (node.type.name === 'image') {
          if (dispatch) {
            if (value) {
              dispatch(state.tr.setNodeMarkup(pos, null, setAttr(node.attrs, 'class', 'shadow-smooth')));
            } else {
              dispatch(state.tr.setNodeMarkup(pos, null, setAttr(node.attrs, 'class', '')));
            }
          }
          return true;
        }
        return false;
      },

      addLink: (value, pos) => ({ state, dispatch }) => {
        const node = state.doc.nodeAt(pos);

        if (node.type.name === 'image') {
          if (dispatch) {
            if (value) {
              dispatch(state.tr.setNodeMarkup(pos, null, setAttr(node.attrs, 'imageLink', value)));
            } else {
              dispatch(state.tr.setNodeMarkup(pos, null, setAttr(node.attrs, 'imageLink', value)));
            }
          }
          return true;
        }
        return false;
      },

      addComment: (value, pos) => ({ state, dispatch }) => {
        const node = state.doc.nodeAt(pos);

        if (node.type.name === 'image') {
          if (dispatch) {
            if (value) {
              dispatch(state.tr.setNodeMarkup(pos, null, setAttr(node.attrs, 'imageComment', value)));
            } else {
              dispatch(state.tr.setNodeMarkup(pos, null, setAttr(node.attrs, 'imageComment', value)));
            }
          }
          return true;
        }
        return false;
      }
    };
  }
});
