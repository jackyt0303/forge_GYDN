import React from 'react';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';

/**
 * Modal dialog component with customizable message, actions and appearance
 * 
 * @param {string} message - The message to display in the modal body
 * @param {Function} handleCancel - Callback function when modal is cancelled/dismissed
 * @param {Function|null} handleConfirm - Optional callback function for confirmation action
 * @param {string} titleAppearance - Appearance style for the modal title ('warning', 'danger', etc)
 * @param {string} buttonAppearance - Appearance style for the modal buttons ('subtle', 'primary', etc)
 * @returns {JSX.Element} Modal dialog component with specified configuration
 */
const ModalDialog = ({ 
    message, 
    handleCancel, 
    handleConfirm = null, 
    titleAppearance = 'warning', 
    buttonAppearance = 'subtle' 
}) => {
    return (
        <Modal onClose={handleCancel}>
            <ModalHeader hasCloseButton>
                <ModalTitle appearance={titleAppearance}>{handleConfirm ? "Confirm Your Action" : "Message"}</ModalTitle>
            </ModalHeader>
            <ModalBody>
                {message}
            </ModalBody>
            <ModalFooter>
                <Button appearance={handleConfirm ? 'subtle' : 'primary'} onClick={handleCancel}>
                    Dismiss
                </Button>
                {!!handleConfirm && (
                    <Button appearance={buttonAppearance} onClick={handleConfirm}>
                        Confirm
                    </Button>
                )}
            </ModalFooter>
        </Modal>
    );
};

// For backward compatibility - renders the component with props
export const showModalDialog = (message, handleCancel, handleConfirm = null, titleAppearance, buttonAppearance) => {
    return (
        <ModalDialog 
            message={message}
            handleCancel={handleCancel}
            handleConfirm={handleConfirm}
            titleAppearance={titleAppearance}
            buttonAppearance={buttonAppearance}
        />
    );
};

export default ModalDialog;
