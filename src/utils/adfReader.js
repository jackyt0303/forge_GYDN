export function convertADFtoString(adfDocs) {
    let output = "";
  
    function processNode(node) {
      if (node.type === "text" && node.text) {
        output += node.text;
      } else if (node.type === "paragraph" && node.content) {
        node.content.forEach(processNode);
        output += " ";
      } else if (node.type === "heading" && node.content) {
        output += `${"#".repeat(node.attrs?.level || 1)} `;
        node.content.forEach(processNode);
        output += ". ";
      } else if (node.type === "bulletList" && node.content) {
        node.content.forEach(processNode);
      } else if (node.type === "listItem" && node.content) {
        output += "- ";
        node.content.forEach(processNode);
        output += ". ";
      } else if (node.type === "orderedList" && node.content) {
        node.content.forEach((item, index) => {
          output += `${index + 1}. `;
          processNode(item);
          output += " ";
        });
      } else if (node.content) {
        node.content.forEach(processNode);
      }
    }
  
    if (adfDocs && adfDocs.content) {
        adfDocs.content.forEach(processNode);
    }
  
    return output.trim();
  }