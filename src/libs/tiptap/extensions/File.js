const { Node, mergeAttributes } = require('@tiptap/core');

module.exports = Node.create({
  name: 'file',

  group: 'block',
  draggable: true,
  selectable: false,
  marks: '',
  atom: true,

  addAttributes () {
    return {
      src: {
        default: null
      },
      id: {
        default: null
      },
      name: {
        default: null
      },
      size: {
        default: null
      },
      percent: {
        default: 1
      },
      projectId: {
        default: null
      },
      taskId: {
        default: null
      }
    };
  },

  parseHTML () {
    return [
      {
        tag: 'vue-component'
      }
    ];
  },

  renderHTML ({ HTMLAttributes }) {
    return ['vue-component', mergeAttributes(HTMLAttributes)];
  },

  addCommands () {
    return {
      setFile: ({ id, url, name, size, projectId = null, taskId = null }) => ({ tr, dispatch }) => {
        const { selection } = tr;

        const node = this.type.create({
          id: id,
          src: url,
          name: name,
          size: size,
          projectId,
          taskId
        });

        if (dispatch) {
          tr.replaceRangeWith(selection.from, selection.to, node);
        }

        return true;
      }
    };
  }
});
