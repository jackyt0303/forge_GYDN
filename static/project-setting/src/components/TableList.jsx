import React from 'react';
import { Text } from '@atlaskit/primitives';
import DynamicTable from '@atlaskit/dynamic-table';
import { IconButton } from '@atlaskit/button/new';

function TableList({
    data,                // Array of data to display
    caption,             // Table caption
    columns,             // Column configuration
    rowsPerPage = 10,    // Number of rows per page
    isLoading = false,   // Loading state
    emptyMessage = "No data found", // Empty state message
    actions = null,      // Actions configuration (for action columns)
    idField = 'id'       // Field to use as unique identifier
}){
    // Create the head configuration for the table
    const tableHead = {
        cells: columns.map(column => ({
            key: column.key,
            content: (
                <div style={{ width: '100%', textAlign: 'center' }}>
                    <Text as='strong' size="large">{column.header}</Text>
                </div>
            ),
            width: column.width,
            isSortable: column.isSortable || false,
        }))
    };

    // Generate table rows from data
    const tableRows = data.map((item, index) => {
        const rowId = item[idField] || index;
        
        return {
            key: `row-${rowId}`,
            cells: columns.map(column => {
                // Check if this is an action column
                if (column.key === 'actions' && actions) {
                    return {
                        key: `actions-${rowId}`,
                        content: (
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                {actions.map((action, actionIndex) => (
                                    <IconButton 
                                        key={`action-${actionIndex}`}
                                        icon={action.icon} 
                                        label={action.label} 
                                        onClick={() => action.onClick(item, rowId)}
                                    />
                                ))}
                            </div>
                        ),
                    };
                }
                
                // Handle custom content renderer if provided
                if (column.renderCell) {
                    return {
                        key: `${column.key}-${rowId}`,
                        content: column.renderCell(item, rowId)
                    };
                }
                
                // Default cell rendering
                return {
                    key: `${column.key}-${rowId}`,
                    content: <div style={{ textAlign: 'center' }}>{item[column.key]}</div>,
                };
            }),
        };
    });

    return(
        <div>
            {data.length === 0 && !isLoading ? (
                <p>No data available.</p>
            ) : (
                <DynamicTable
                    caption={caption}
                    head={tableHead}
                    rows={tableRows}
                    rowsPerPage={rowsPerPage}
                    defaultPage={1}
                    loadingSpinnerSize="large"
                    isLoading={isLoading}
                    emptyView={<Text>{emptyMessage}</Text>}
                />
            )}
        </div>
    );
}

export default TableList;