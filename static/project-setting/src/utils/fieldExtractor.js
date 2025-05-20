export const extractFieldsFromTemplate = (templateCode) =>{
    try {
        const matches = [...templateCode.matchAll(/\$\{([^}]+)\}/g)].map((m) => m[1]);
        return([...new Set(matches)]);
    } catch (error) {
        console.error('Error fetching custom fields:'+ error);
        return([])
    }
}