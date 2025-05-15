// TemplateEditor.jsx
import React from 'react';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import './TemplateEditor.css'

/**
 * TemplateEditor Component
 * 
 * A React component that provides a UI for editing templates with JSON/XML support.
 *
 * @component
 * @param {Object} props - Component props
 * @param {string} props.code - The template code/content being edited
 * @param {Function} props.setCode - Function to update the template code
 * @param {string} props.templateName - Name of the template
 * @param {Function} props.setTemplateName - Function to update template name
 * @param {Function} props.handleSubmit - Function called when saving the template
 * @param {Function} props.handleFileUpload - Function to handle file upload events
 * @param {Function} props.handleTabKey - Function to handle tab key press in editor
 * @returns {JSX.Element} A template editor interface with text input, code editor and file upload
 */
function TemplateEditor({ 
  code, 
  setCode, 
  templateName, 
  setTemplateName, 
  handleSubmit,
  handleFileUpload,
  handleTabKey
}) {
  return (
    <div className="editor-wrapper">
      <h2>📝Template Editor</h2>
      <div>
        <label>Template Name:</label>
        <Textfield 
          id="atlaskit-textfield"
          appearance="standard"
          placeholder="Enter Your Template Name here"
          isRequired="true"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
        />
      </div>
      
      <textarea
        className='editor'
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={handleTabKey}
        rows={20}
        cols={80}
      />
      <div className="file-upload-row">
        <label>Upload JSON/XML:</label>
        <input type="file" accept=".json,.xml" onChange={handleFileUpload} />
      </div>
      <div className='button-row'>
        <Button appearance="primary" onClick={handleSubmit}>Save Template</Button>
      </div>
    </div>
  );
}

export default TemplateEditor;