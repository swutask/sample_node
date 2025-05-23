const { Node } = require('@tiptap/core');

module.exports = Node.create({
  name: 'doc',
  topNode: true,
  content: 'block+'
});
