// src/project-setting/src/App.jsx
import React, { useState, useEffect } from 'react';
import { invoke } from '@forge/bridge';
import './ProjectSetting.css';
import { useAppContext } from '../Context';
import Button from '@atlaskit/button/new';
import { Stack, Inline, Text } from '@atlaskit/primitives';
import Textfield from '@atlaskit/textfield';
import DynamicTable from '@atlaskit/dynamic-table';
import { IconButton } from '@atlaskit/button/new';
import EditIcon from '@atlaskit/icon/core/edit';
import DeleteIcon from '@atlaskit/icon/core/delete';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Loader from '../components/Loader';
import { validateTemplate } from '../utils/templateValidation';
import { extractFieldsFromTemplate } from '../utils/fieldExtractor';
import ModalDialog from '../components/modalDialog';
import TemplateEditor from '../components/TemplateEditor';

function ProjectSetting() {
  const context = useAppContext();
  const [customFields, setCustomFields] = useState([]);
  const [customFieldValues, setCustomFieldValues] = useState({}); // TODO: Fetch actual values from Jira
  const [customFieldValuesRef, setCustomFieldValuesRef] = useState({});
  const [message, setMessage] = useState('');
  const [code, setCode] = useState(
    '{\n    "Instruction": "${summary}"\n}'
  );
  const [language, setLanguage] = useState('json');
  const [infoPanel, setInfoPanel] = useState('templates'); // either 'templates' or 'fields' //tabs 
  const [templateName, setTemplateName] = useState('');
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // New loading state
  const [alertMessage, setAlertMessage] = useState('');
  const [alertAction, setAlertAction] = useState(null);
  const [buttonAppearance, setButtonAppearance] = useState('subtle'); 
  const [titleAppearance, setTitleAppearance] = useState('warning'); // Default appearance for the message modal

  const showAlert = (message, action) => {
    setAlertMessage(message);
    setAlertAction(() => action);
  };

  const handleConfirm = async () => {
    if (alertAction) await alertAction();
    setAlertMessage('');
    setAlertAction(null);
    setButtonAppearance('subtle'); 
    setTitleAppearance('warning'); 
  };

  const handleCancel = () => {
    setAlertMessage('');
    setAlertAction(null);
    setMessage('');
    // setMessage(''); // Add this line to clear error messages
    setButtonAppearance('subtle');
    setTitleAppearance('warning'); 
    setInfoPanel('templates'); // Reset to default tab
  };

  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true); // Start loading
        await fetchCustomFieldValuesRef(); // Fetch custom field values from Jira
        await fetchTemplates();
      } catch (error) {
        handleError(
          error,
          "Unable to load templates and project data. Please try refreshing the page. If the problem persists, check your network connection or contact support.",
          'Initialization'
        );
      } finally {
        setIsLoading(false); // End loading
      }
    };
    initializeData();
  }, []);

  useEffect(() => {
    fetchCustomField();
  }, [code]); 

  const fetchTemplates = async () => {
    try {
      const allTemplates = await invoke('getAllTemplate');
      setTemplates(allTemplates);
    } catch (error) {
      handleError(
        error,
        "We couldn't retrieve your available templates. Please try again in a moment or contact your administrator if this issue continues.",
        'fetching all template'
      );
      setTemplates([]);
    }
  };

  const fetchCustomField = async () => {
    try {
      setCustomFields(extractFieldsFromTemplate(code))
    } catch (error) {
      handleError(
        error,
        "Problem analyzing the template fields. The template might be incorrectly formatted. Please check the template format or try a different one.",
        'custom field extraction'
      );
      setCustomFields([]);
    }
  };

  const fetchCustomFieldValuesRef = async () => {
    try {
      const fieldRef = await invoke('getFieldValuesRef', { payload: { pkey: context.extension.project.key } });
      setCustomFieldValuesRef(fieldRef); 
      return fieldRef;
    } catch (error) {
      handleError(
        error,
        "Could not retrieve project field references. Some field validations might not work correctly. Try refreshing the page, or proceed with caution.",
        'fetching field value references'
      );
      setCustomFieldValuesRef({}); // Fallback to empty object
      return {};
    }
  };

  const handleFileUpload = async (e) => {
    try {
      const file = e.target.files[0];
      
      if (!file) {
        setMessage("No file was selected. Please choose a JSON or XML file to upload.");
        return;
      }
      
      if (!['json', 'xml'].includes(file.name.split('.').pop().toLowerCase())) {
        setMessage("Unsupported file type. Please upload only JSON or XML files. Other formats are not compatible with this tool.");
        return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
          const rawContent = event.target.result;
          const fileType = file.name.split('.').pop().toLowerCase();
          setLanguage(fileType === 'xml' ? 'xml' : 'json');
          const validation_fu = validateTemplate(rawContent, fileType); 
          
          if (!validation_fu.isValid) {
            setMessage(`${validation_fu.message} Please fix the errors in your file before uploading again.`);
            return;
          }
          setCode(rawContent);
          fetchCustomField(); 
      };
      
      reader.readAsText(file);

    } catch (error) {
      handleError(
        error,
        "An unexpected error occurred while uploading your file. Please try again or use a different file."
      );
    }
  };

  const handleSubmit = async () => {
    setButtonAppearance('primary'); 
    showAlert('Are you sure you want to save this template?', async () => {
      try {
        setIsLoading(true);
        
        if (!templateName) {
          setMessage("Please enter a template name before saving. A descriptive name helps identify the template later.");
          setIsLoading(false);
          return;
        }
        
        const value = code;
        const tempName = templateName || 'Unnamed Template'; 
        
        const validation = validateTemplate(value, language);
        if (!validation.isValid) {
          setMessage(`${validation.message} Please correct the template format before saving.`);
          setIsLoading(false);
          return;
        }

        // Store template in forge storage
        await invoke('saveValueWithGeneratedKey', { 
          payload: { 
            projectKey: context.extension.project.key, 
            value: value, 
            dataType: language, 
            name: tempName
          }
        })
        .then((name) => {
          setMessage(`✅ Template saved successfully with name: ${name}`);
        })
        .catch((error) => {
          handleError(
            error,
            "Failed to save template. This might be due to network issues or permission problems. Please try again or contact your administrator if the problem persists.",
          );
        });
      } catch (err) {
        console.error('Error in handleSubmit:', err);
      } finally {
        setIsLoading(false);
        fetchTemplates();
      }
    });
  };

  const handleDelete = async (key) => {
    setButtonAppearance('danger');
    setTitleAppearance('danger');
    showAlert(`Are you sure you want to delete the template with key: ${key}?`, async () => {
      try {
        setIsLoading(true);
        await invoke('deleteValue', { payload: { key: key } });
        setMessage(`✅ Template with key ${key} deleted successfully.`);
      } catch (error) {
        handleError(
          error,
          `Failed to delete template with key: ${key}. This could be due to network issues or the template may no longer exist. Please refresh the page and try again.`,
          "Delete Template"
        );
      } finally {
        setIsLoading(false);
        fetchTemplates();
      }
    });
  };

  const handleEditCode = async (value) => {
    setButtonAppearance('primary');
    showAlert('Are you sure you want to edit this template?', () => {
      try {
        setCode(value.template);
        setLanguage(value.datatype);
      } catch (error) {
        handleError(
          error,
          "Failed to load the template for editing. The template might be corrupted. Try selecting a different template.",
          "Edit code"
        );
      }
    });
  };

  const handleError = (error, errorMessage, operation = '') => {
    const prefix = '[ProjectSetting]';
    console.error(`${prefix} Error ${operation ? `during ${operation}` : ''}:`, error);
    setMessage(errorMessage);
  };

  const handleTabKey = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const updatedCode = 
        code.substring(0, start) + '    ' + code.substring(end);
      
      setCode(updatedCode);

      // Delay updating caret position until after DOM update
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
    }
  }

  if (isLoading) {
    return <Loader />
  }
  
  return (
    <div className="project-setting-container">
      {(!!alertMessage || !!message) && <ModalDialog 
        message={alertMessage || message}
        handleCancel={handleCancel}
        handleConfirm={!!alertMessage? handleConfirm : null}
        titleAppearance={titleAppearance}
        buttonAppearance={buttonAppearance}
      />}
      
      <Inline space='space.200' grow='fill'>
      <TemplateEditor
          code={code}
          setCode={setCode}
          templateName={templateName}
          setTemplateName={setTemplateName}
          language={language}
          handleSubmit={handleSubmit}
          handleFileUpload={handleFileUpload}
          handleTabKey={handleTabKey}
        />
        {/* <div className="editor-wrapper">
          <h2>📝Template Editor</h2>
          <div>
            <label>Template Name:</label>
            <Textfield 
              id="atlaskit-textfield"
              appearance="standard"
              placeholder="Enter Your Template Name here"
              isRequired = 'true'
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
        </div> */}

        <div className="info-panel">
          <Tabs onChange={(index) => setInfoPanel(index === 0?'templates':'fields')} id="default">
            <TabList>
              <Tab>Templates</Tab>
              <Tab>Fields</Tab>
            </TabList>
          </Tabs>

          {infoPanel === 'templates' ? (
            <div>
              {templates.length === 0 ? (
                <p>No templates available.</p>
              ) : (
                <>                
                <DynamicTable
                  caption="Available Templates"
                  head={{
                    cells: [
                      {
                        key: 'template',
                        content: (
                          <div style={{ width: '100%', textAlign: 'center' }}>
                            <Text as='strong' size="large">Template</Text>
                          </div>
                        ),
                        width: 70,
                        isSortable: true,
                      },
                      {
                        key: 'actions',
                        content: (
                          <div style={{ width: '100%', textAlign: 'center' }}>
                            <Text as='strong' size="large">Actions</Text>
                          </div>
                        ),
                        width: 30,
                      },
                    ],
                  }}
                  rows={templates.map(({key, value}) => ({
                    key: `row-${key}`,
                    cells: [
                      {
                        key: `template-${key}`,
                        content: <div style={{ textAlign: 'center' }}>{value.name}</div>,
                      },
                      {
                        key: `actions-${key}`,
                        content: (
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <IconButton icon={EditIcon} label="Edit" onClick={() => handleEditCode(value)}/>
                            <IconButton icon={DeleteIcon} label="Delete" onClick={() => handleDelete(key)}/>
                          </div>
                        ),
                      },
                    ],
                  }))}
                  rowsPerPage={10}
                  defaultPage={1}
                  loadingSpinnerSize="large"
                  isLoading={isLoading}
                  emptyView={<Text>No templates found</Text>}
                />
                </>
              )
              }
              
            </div>
          ) : (
            <div>
              <DynamicTable
                  caption="Detected Fields"
                  head={{
                    cells: [
                      {
                        key: 'template',
                        content: (
                          <div style={{ width: '100%', textAlign: 'center' }}>
                            <Text as='strong' size="large">Field ID</Text>
                          </div>
                        ),
                        width: 60,
                        isSortable: true,
                      },
                      {
                        key: 'actions',
                        content: (
                          <div style={{ width: '100%', textAlign: 'center' }}>
                            <Text as='strong' size="large">Availability</Text>
                          </div>
                        ),
                        width: 40,
                      },
                    ],
                  }}
                  rows={customFields.map((field) => ({
                    key: `row-${field}`,
                    cells: [
                      {
                        key: `cell-${field}`,
                        content: <div style={{ textAlign: 'center' }}>{field}</div>,
                      },
                      {
                        key: `actions-${field}`,
                        content: (<Text>{(customFieldValuesRef[field]) ? 'Available':'Not Found'}</Text>),
                      },
                    ],
                  }))}
                  rowsPerPage={5}
                  defaultPage={1}
                  loadingSpinnerSize="medium"
                  isLoading={isLoading}
                  emptyView={<Text>No fields found</Text>}
                />
              <DynamicTable
                  caption="Project Fields"
                  head={{
                    cells: [
                      {
                        key: 'ProjectFieldID',
                        content: (
                          <div style={{ width: '100%', textAlign: 'center' }}>
                            <Text as='strong' size="large">Field ID</Text>
                          </div>
                        ),
                        isSortable: true,
                      },
                      {
                        key: 'ProjectFieldName',
                        content: (
                          <div style={{ width: '100%', textAlign: 'center' }}>
                            <Text as='strong' size="large">Name</Text>
                          </div>
                        ),
                        isSortable: true,
                      },
                    ],
                  }}
                  rows={Object.entries(customFieldValuesRef).map(([field, value]) =>({
                    key: `row-${field}`,
                    cells: [
                      {
                        key: `cell-${field}`,
                        content: <div style={{ textAlign: 'center' }}>{field}</div>,
                      },
                      {
                        key: `actions-${field}`,
                        content: (<Text>{value ? value : 'Not Found'}</Text>),
                      },
                    ],
                  }))}
                  rowsPerPage={8}
                  defaultPage={1}
                  loadingSpinnerSize="medium"
                  isLoading={isLoading}
                  emptyView={<Text>No fields found</Text>}
                />
            </div>
          )}
        </div>
      </Inline>
    </div>
  );
}

export default ProjectSetting;
