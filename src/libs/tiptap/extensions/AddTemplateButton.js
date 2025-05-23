const { Node } = require('@tiptap/core');

module.exports = Node.create({
  name: 'addTemplate',

  group: 'block',
  selectable: false,

  parseHTML () {
    return [{ tag: 'button.add-template' }];
  },

  renderHTML () {
    return ['button', { class: 'add-template' }, 'Use template'];
  },

  addCommands () {
    return {
      addTemplateButton: () => ({ state, dispatch, tr }) => {
        const node = state.schema.nodes.addTemplate.create(null);

        dispatch(tr.insert(tr.doc.content.size, node));
      },

      removeTemplateButton: () => ({ state, dispatch, tr }) => {
        state.doc.nodesBetween(1, tr.doc.content.size, (node, startPos) => {
          if (node.type.name === 'addTemplate') {
            dispatch(tr.delete(startPos, startPos + 1));
          }
        });
      }
    };
  },

  addNodeView () {
    return () => {
      const dom = document.createElement('button');

      dom.classList.add('add-template');

      const openTemplateModal = () => {

      };

      dom.addEventListener('click', openTemplateModal);

      dom.innerHTML = 'Use template';

      return {
        dom,
        destroy () {
          dom.removeEventListener('click', openTemplateModal);
        }
      };
    };
  }
});
