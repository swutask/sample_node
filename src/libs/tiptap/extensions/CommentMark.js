const { Mark } = require('@tiptap/core');

module.exports = Mark.create({
  name: 'commentMark',

  addAttributes () {
    return {
      id: {
        default: null,
        parseHTML: element => ({ id: element.getAttribute('commentid') }),
        renderHTML: attrs => attrs.commentid ? { id: attrs.commentid } : {}
      },
      commentid: {
        default: null,
        parseHTML: element => ({ commentid: element.getAttribute('commentid') }),
        renderHTML: attrs => attrs.commentid ? { commentid: attrs.commentid } : {}
      },
      comments: {
        default: null,
        parseHTML: element => ({ comments: element.getAttribute('comments') }),
        renderHTML: attrs => attrs.comments ? { comments: attrs.comments } : {}
      }
    };
  },

  parseHTML () {
    return [
      {
        priority: 51,
        tag: 'span[comments]',
        getAttrs: dom => ({
          id: dom.getAttribute('id'),
          comments: dom.getAttribute('comments'),
          commentid: dom.getAttribute('commentid')
        })
      }
    ];
  },

  renderHTML ({ HTMLAttributes }) {
    return ['span', {
      id: HTMLAttributes.id,
      comments: HTMLAttributes.comments,
      commentid: HTMLAttributes.commentid,
      class: 'comment'
    }, 0];
  },

  addCommands () {
    return {
      addComment: attributes => ({ commands }) => {
        commands.setMark('commentMark', attributes);
      },

      updateComment: ({ from, to, attrs }) => ({ commands }) => {
        commands.setTextSelection({ from, to });
        commands.unsetMark('commentMark');
        commands.setMark('commentMark', attrs);
      },

      removeComment: ({ from, to }) => ({ commands }) => {
        commands.setTextSelection({ from, to });
        commands.unsetMark('commentMark');
      }
    };
  }
});
