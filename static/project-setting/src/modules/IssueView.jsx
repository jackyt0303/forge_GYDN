import React, { useState, useEffect } from "react";
import { useAppContext } from '../Context';
import Loader from "../components/Loader";
import ModalDialog from "../components/ModalDialog";
import TableList from "../components/TableList";
import { invoke } from '@forge/bridge';
import { useTemplate } from '../hooks/usetemplate';

import AddIcon from '@atlaskit/icon/core/add';
import Button from '@atlaskit/button/new';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '@atlaskit/modal-dialog';
import { Stack, Text } from '@atlaskit/primitives';
import { CodeBlock } from '@atlaskit/code';
import DynamicTable from '@atlaskit/dynamic-table';
import { IconButton } from '@atlaskit/button/new';
import './IssueView.css';

const isEmpty = (value) => {
    if (value === "" || value === null || value === undefined) return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'object' && Object.keys(value).length === 0) return true;
    return false;
};

function IssueView(){
    const context = useAppContext();
    const { templates, isLoading: templatesLoading, error: templatesError} = useTemplate();

    const [issueKey,setIssueKey] = useState(context.extension.issue.key);
    const [issueFields, setIssueFields] = useState([]); // All issue fields values 
    const [missingFields, setMissingFields] = useState([]); // Missing fields in the template
    const [isVerifying, setIsVerifying] = useState(false);

    const [templateName, setTemplateName] = useState(''); // Template name
    const [templateLanguage, setTemplateLanguage] = useState(''); // Template language, JSON or XML
    const [completedTemplate, setCompletedTemplate] = useState(''); 

    const [dialogAction, setDialogAction] = useState(null);
    const [dialogMessage, setDialogMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [missingFieldOperationMessage, setMissingFieldOperationMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const initializeData = async () => {
            try {
                setIsLoading(true);
                console.log('Running initialization...');
                await fetchIssueFields().then((issueData) => {
                    setIssueFields(issueData);
                });

            } catch(error) {
                console.error('Error initializing data:', error);
                setErrorMessage('Unable to load templates and issue data. Please try refreshing the page. If the problem persists, check your network connection or contact support.');
                handleAlert('Error initializing data: ' + error.message, null);
            } finally {
                setIsLoading(false);
            } 
        };
        initializeData();
    },[issueKey]);

    const cleanUp = () => {
        setDialogMessage("");
        setDialogAction(null);
        setErrorMessage("");
        setIsVerifying(false);
        setMissingFields([]);
        setCompletedTemplate("");
        setTemplateName('');
        setTemplateLanguage('');
        setMissingFieldOperationMessage("");
    };

    const fetchIssueFields = async () => {
        try {
            const issueData = await invoke("getIssueFields",{payload:{issueKey: issueKey}});
            return issueData;
        } catch (error) {
            console.error('Error fetching IssueFields:', error);
            setErrorMessage("Unable to load issue data. This might be due to missing permissions or a network issue. Please refresh the page or contact support.");
            return {};
        }
    };

    const handleAlert = (message, action) => {
        setDialogMessage(message);
        setDialogAction(() => action);
    }

    const handleCancel = () => {
        cleanUp();
    }

    const handleConfirm = async () => {
        try {
            setIsLoading(true);
            if (dialogAction) await dialogAction();
        } catch (error) {
            console.error('Error confirming action:', error);
            cleanUp();
        } finally {
            setIsLoading(false);
            setDialogAction(null);
            setDialogMessage(null);
        }      
    }

    const fetchCustomField = async (templateContent) => {
        try {
            const matches = [...templateContent.matchAll(/\$\{([^}]+)\}/g)].map((m) => m[1]);
            return([...new Set(matches)]);
        } catch (error) {
            console.error('[IP]Error fetching custom fields:', error);
            setErrorMessage("Problem analyzing the template fields. The template might be incorrectly formatted. Please check the template format or try a different template.");
            return [];
        }
      };

      const handleVerified = async () => {
        try {
            if (!completedTemplate || !templateLanguage) {
                throw new Error("Template content or language is missing.");
            }
    
            // Decide MIME type based on file extension
            let mimeType = "text/plain";
            let fileExtension = "txt";
    
            if (templateLanguage.toLowerCase() === "json") {
                mimeType = "application/json";
                fileExtension = "json";
            } else if (templateLanguage.toLowerCase() === "xml") {
                mimeType = "application/xml";
                fileExtension = "xml";
            }
    
            const blob = new Blob([completedTemplate], { type: mimeType });
            const url = URL.createObjectURL(blob);
    
            const a = document.createElement("a");
            a.href = url;
            a.download = `${templateName}.${fileExtension}`;
            a.click();
            URL.revokeObjectURL(url);
    
            
        } catch (error) {
            console.error("Error downloading the template:", error);
            setErrorMessage("We couldn't generate your download. Please check if your browser allows downloads from this site, or try saving the content manually by copying it to a text file.");
            cleanUp();
        } finally{
            // Optional cleanup
            cleanUp();
        }
    };
    

    const handleSelectTemplate = async (template) => {
        handleAlert(`Are you sure you want to select the template "${template.name}"?`, async () => {
        try {
            // Extract fields from the template
            const customFields = await fetchCustomField(template.template);
            
            // compare the template fields with the issue fields and map them accordingly
            const {mappedFields,  missingFields: missingFieldsHere} = await mapCustomFieldsToValues(customFields, issueFields);
            
            // replace the template fields with the mapped values    
            let mappedValues;
            try {
                mappedValues = await invoke('mapFields', { payload: { missingFields: missingFieldsHere, mappedFields: mappedFields, template: template.template}});
                // setMissingFieldOperationMessage(missingFieldOperationMessage);
                if (mappedValues === null || Object.keys(mappedValues).length === 0 || mappedValues === undefined) throw new Error('No mapped values returned from the server.');
            } catch (error) {
                console.error('Error: mapped values:', mappedValues);
                console.error('Error during field mapping:', error.message);
                throw error; // Re-throw to properly signal failure
            }

            const mappedTemplate = await regexMapping(template.template, mappedValues);
            setCompletedTemplate(mappedTemplate);
            setTemplateLanguage(template.datatype);
            setTemplateName(template.name);
            setIsVerifying(true);
        } catch (error) {
            console.error('Error selecting template:', error);
            setErrorMessage(`There was a problem processing template "${template.name}". This might be due to missing fields or formatting issues. Try a different template or contact support for assistance.`);
            cleanUp();
        }         
        });
    }

    const mapCustomFieldsToValues = async (customFields, issueFields) => {
        let mappedFields = {};
        try {
            // Find missing fields
            let missingFieldsHere = [];
            
            // Map customFields to their corresponding values in fieldValues
            mappedFields = customFields.reduce((acc, field) => {
                if (!issueFields[field]) {
                    acc[field] = 'missing value'; 
                    missingFieldsHere.push(field);
                }else if (issueFields[field] && isEmpty(issueFields[field])){
                    acc[field] = 'empty value';
                    missingFieldsHere.push(field);
                }else{
                    acc[field] = issueFields[field];
                }
                return acc;
            }, {});

            // add description field to the mappedFields
            if (isEmpty(mappedFields.description)) {
                mappedFields.description = issueFields.description;
            }
            // console.log('missingFieldsHere:', missingFieldsHere);
            if (missingFieldsHere.length > 0) {
                
                setMissingFields(missingFieldsHere);
            }

            return {"mappedFields":mappedFields, "missingFields":missingFieldsHere}; 
        } catch (error) {
            console.error('Error during field mapping:', error.message);
            throw error; // Re-throw to properly signal failure
        } 
    };

    const regexMapping = (templateContent, mappedFields) => {
        try {
            // Replace the template fields with the mapped values
            let finalTemplate = templateContent;

            // Use the same pattern as in fetchCustomField
            for (const [field, value] of Object.entries(mappedFields)) {
                
                // Escape special regex characters : " . * + ? ^ $ { } ( ) | [ ] \ " to ensure misinterpretation
                const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the matched substring, '\\' means to escape \ using a single \
                
                // Use a literal regex pattern with escaping
                const regex = new RegExp(`\\$\\{${escapedField}\\}`, 'g');
                
                // Replace all occurrences of the placeholder with the actual value
                finalTemplate = finalTemplate.replace(regex, value);
            }
            return finalTemplate;
        } catch (error) {
            console.error('Error modifying template:', error);
            setErrorMessage('Failed to map field values to the template. This might be due to unexpected characters in the field values. Try again with different field values or contact support.');
        }
    }

    if (isLoading || templatesLoading) {
        return <Loader/>;
    }

    if (templatesError) {
        return (
            <div className="issue-view-container">
                <Stack alignInline="center" grow="fill" space="space.200">
                    <Text>{templatesError.message}</Text>
                </Stack>
            </div>
        );
    }

    const templateColumns = [
        {
            key: 'template',
            header: 'Template',
            width: 75,
            isSortable: true,
            renderCell: (item) => <Text align="center">{item.value.name}</Text>
        },
        {
            key: 'actions',
            header: 'Actions',
            width: 25
        }
    ];

    const templateActions = [
        {
            icon: AddIcon,
            label: 'Select',
            onClick: (item) => handleSelectTemplate(item.value)
        }
    ];

    return (
        <div className="issue-view-container">
            <Stack alignInline="center" grow="fill" space="space.200">
                {!!dialogMessage && (
                    <ModalDialog
                        message={dialogMessage}
                        handleCancel={handleCancel}
                        handleConfirm={handleConfirm}
                        titleAppearance="warning"
                        buttonAppearance="primary"
                    />
                )}

                {!!errorMessage && (
                    <ModalDialog
                        message={
                            <>
                                <Text as="p">{errorMessage}</Text>
                                <Text as="p" color="subtle">If this issue persists, please contact Jacky with error code: {Date.now().toString(36)}</Text>
                            </>
                        }
                        handleCancel={() => setErrorMessage("")}
                        titleAppearance="danger"
                    />
                )}

                {!!isVerifying ? (
                    <div className="verifying-template-container">
                        <Stack space="space.200" alignBlock="start" grow="fill">
                            {(missingFields.length > 0) && (
                                <Text>
                                    The following custom fields are missing in the current issue's fields, attempted to fill the value from the Description field:  
                                    <Text as='strong' size="large">{missingFields.join(', ')}</Text>
                                </Text>
                            )}
                            <div className="template-preview">
                                <CodeBlock language={templateLanguage} text={completedTemplate} />
                            </div>
                            <div className="actions-container">
                                <Button appearance="subtle" onClick={handleCancel}>
                                    Cancel
                                </Button>
                                <Button appearance='primary' onClick={handleVerified}>
                                    Download 
                                </Button>
                            </div>
                        </Stack>
                    </div>
                ) : (
                    <TableList
                        data={templates}
                        columns={templateColumns}
                        actions={templateActions}
                        isLoading={isLoading}
                        emptyMessage="No templates available"
                        idField="key"
                    />
                )}
            </Stack>
        </div>
    );
}

export default IssueView;

