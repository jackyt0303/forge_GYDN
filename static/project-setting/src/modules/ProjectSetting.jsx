// src/project-setting/src/App.jsx
import React, { useState, useEffect } from 'react';
import { invoke } from '@forge/bridge';

import './ProjectSetting.css';

import { useAppContext } from '../Context';

import { validateTemplate } from '../utils/templateValidation';
import { extractFieldsFromTemplate } from '../utils/fieldExtractor';

import Loader from '../components/Loader';
import ModalDialog from '../components/modalDialog';
import TemplateEditor from '../components/TemplateEditor';

import { Inline, Text } from '@atlaskit/primitives';
import DynamicTable from '@atlaskit/dynamic-table';
import { IconButton } from '@atlaskit/button/new';
import EditIcon from '@atlaskit/icon/core/edit';
import DeleteIcon from '@atlaskit/icon/core/delete';
import Tabs, { Tab, TabList } from '@atlaskit/tabs';


function ProjectSetting() {
  const context = useAppContext();
  const [customFields, setCustomFields] = useState([]);
  const [projectField, setprojectField] = useState({});
  const [templateCode, setTemplateCode] = useState(
    '{\n    "Instruction": "${summary}"\n}'
  );
  const [language, setLanguage] = useState('json');
  const [infoPanel, setInfoPanel] = useState('templates'); // either 'templates' or 'fields' //tabs 
  const [templateName, setTemplateName] = useState('');
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // New loading state

  const [modalState, setModalState] = useState({
    message: '',           // Regular message
    alertMessage: '',      // Confirmation message
    alertAction: null,     // Action to perform on confirmation
    buttonAppearance: 'subtle',
    titleAppearance: 'warning'
  });
  

  const showAlert = (message, action) => {
    setModalState(prevState=>({
      ...prevState,
      alertMessage: message,
      alertAction: action
    }))
  };

  const handleConfirm = async () => {
    if (modalState.alertAction) await modalState.alertAction();
    setModalState(prevState=>({
      ...prevState,
      alertMessage: '',
      alertAction: null,
      buttonAppearance:'subtle',
      titleAppearance:'warning'
    }))
  };

  const handleCancel = () => {
    setModalState({
      message: '',
      alertMessage: '',
      alertAction: null,
      buttonAppearance: 'subtle',
      titleAppearance: 'warning'
    });
    setInfoPanel('templates'); // Reset to default tab
  };

  const setMessage = (message) => {
    setModalState(prevState => ({
      ...prevState,
      message
    }));
  };

  const setButtonAppearance = (appearance) => {
    setModalState(prevState => ({
      ...prevState,
      buttonAppearance: appearance
    }));
  };
  
  const setTitleAppearance = (appearance) => {
    setModalState(prevState => ({
      ...prevState,
      titleAppearance: appearance
    }));
  };

  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true); // Start loading
        await fetchprojectField(); // Fetch custom field values from Jira
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
  }, [templateCode]); 

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
      setCustomFields(extractFieldsFromTemplate(templateCode))
    } catch (error) {
      handleError(
        error,
        "Problem analyzing the template fields. The template might be incorrectly formatted. Please check the template format or try a different one.",
        'custom field extraction'
      );
      setCustomFields([]);
    }
  };

  const fetchprojectField = async () => {
    try {
      const fieldRef = await invoke('getFieldValuesRef', { payload: { pkey: context.extension.project.key } });
      setprojectField(fieldRef); 
      return fieldRef;
    } catch (error) {
      handleError(
        error,
        "Could not retrieve project field references. Some field validations might not work correctly. Try refreshing the page, or proceed with caution.",
        'fetching field value references'
      );
      setprojectField({}); // Fallback to empty object
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
          setTemplateCode(rawContent);
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
        
        const value = templateCode;
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

  const handleEditTemplateCode = async (value) => {
    setButtonAppearance('primary');
    showAlert('Are you sure you want to edit this template?', () => {
      try {
        setTemplateCode(value.template);
        setLanguage(value.datatype);
      } catch (error) {
        handleError(
          error,
          "Failed to load the template for editing. The template might be corrupted. Try selecting a different template.",
          "Edit templateCode"
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
      const updatedTemplateCode = 
        templateCode.substring(0, start) + '    ' + templateCode.substring(end);
      
      setTemplateCode(updatedTemplateCode);

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
      {(!!modalState.alertMessage || !!modalState.message) && 
        <ModalDialog 
          message={modalState.alertMessage || modalState.message}
          handleCancel={handleCancel}
          handleConfirm={!!modalState.alertMessage? handleConfirm : null}
          titleAppearance={modalState.titleAppearance}
          buttonAppearance={modalState.buttonAppearance}
        />}
      
      <Inline space='space.200' grow='fill'>
      <TemplateEditor
          code={templateCode} 
          setcode={setTemplateCode} 
          templateName={templateName}
          setTemplateName={setTemplateName}
          language={language}
          handleSubmit={handleSubmit}
          handleFileUpload={handleFileUpload}
          handleTabKey={handleTabKey}
        />

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
                            <IconButton icon={EditIcon} label="Edit" onClick={() => handleEditTemplateCode(value)}/>
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
                        content: (<Text>{(projectField[field]) ? 'Available':'Not Found'}</Text>),
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
                  rows={Object.entries(projectField).map(([field, value]) =>({
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
