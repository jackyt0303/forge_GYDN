import React from "react";
import { Stack, Text } from '@atlaskit/primitives';
import { CodeBlock } from '@atlaskit/code';
import Button from '@atlaskit/button/new';
import './VerifyTemplate.css';

/**
 * Component for displaying and verifying a completed template before download
 * @param {Object} props Component props
 * @param {Array} props.missingFields List of missing fields
 * @param {string} props.templateLanguage Language of the template (json, xml, etc.)
 * @param {string} props.completedTemplate The completed template content
 * @param {Function} props.onCancel Handler for cancel button
 * @param {Function} props.onVerified Handler for download button
 */
function VerifyTemplate({ missingFields = [], templateLanguage, completedTemplate, onCancel, onVerified }) {
    return (
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
                    <Button appearance="subtle" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button appearance='primary' onClick={onVerified}>
                        Download 
                    </Button>
                </div>
            </Stack>
        </div>
    );
}

export default VerifyTemplate;
