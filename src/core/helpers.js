function getAttachments ({ json, returnAsArray = true }) {
  const nodes = [];

  json.content
    .filter(item => item.type === 'paragraph' && item.content?.length)
    .map(item => item.content)
    .forEach(item => nodes.push(...item));

  const imagesId = nodes.filter(item => item.type === 'image').map(item => +item.attrs.id);
  const filesId = json.content.filter(item => item.type === 'file').map(item => +item.attrs.id);

  if (returnAsArray) return [...imagesId, ...filesId];

  return { images: imagesId, files: filesId };
}

const pluralizeWord = (text, count) => count === 1 ? text : text + 's';

module.exports = {
  getAttachments,
  pluralizeWord
};
