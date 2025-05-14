export function missingFieldMessage(firstResContent, finalResContent) {
    console.log('1st content: ', firstResContent);
    console.log('final content: ', finalResContent);

    const originalMissingFieldID = [];
    const llmModifiedFieldID = [];
    const unmodifiedFieldID = [];

    Object.entries(firstResContent).forEach(([key, value]) => {
        if (value === 'missing value' || value === 'empty value') {
            originalMissingFieldID.push(key);
        }
    });

    for (const key of originalMissingFieldID) {
        if (finalResContent[key] !== 'missing value' || finalResContent[key] !== 'empty value') {
            llmModifiedFieldID.push(key);
        }
    }

    for (const key of originalMissingFieldID) {
        if(!llmModifiedFieldID.includes(key)) {
            unmodifiedFieldID.push(key);
        }
    }

    return {originalMissingFieldID, llmModifiedFieldID, unmodifiedFieldID};

    if (llmModifiedFieldID.length === originalMissingFieldID.length) {
        return <Text>The following custom fields are missing in the current issue: <Text as='strong' size="large">{originalMissingFieldID.join(', ')}</Text></Text>
    }else if (llmModifiedFieldID.length > originalMissingFieldID.length) {
        return (
        <div>
            <Text>The following custom fields are missing in the current issue: <Text as='strong' size="large">{unmodifiedFieldID.join(', ')}</Text></Text>
            <br/>
            <Text>The following custom fields are found from the Description: <Text as='strong' size="large">{llmModifiedFieldID.join(', ')}</Text></Text>
        </div>
    )}else{
        return null;
    }

    
}