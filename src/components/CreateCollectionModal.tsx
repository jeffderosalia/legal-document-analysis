import React, { useState } from 'react';
import {Modal} from './Modal'
import {Document} from '../types'

interface CollectionCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: string[];
  onCreateCollection: (collection: CollectionData) => void;
}

interface CollectionData {
  name: string;
  documents: string[];
}

export const CreateCollectionModal: React.FC<CollectionCreationModalProps> = ({ 
    isOpen, 
    onClose, 
    documents = [], 
    onCreateCollection 
  }) => {
    const [collectionName, setCollectionName] = useState<string>('');
    const [error, setError] = useState<string>('');
  
    const handleCreate = (): void => {
      if (!collectionName.trim()) {
        setError('Collection name is required');
        return;
      }
      
      if (documents.length < 2 || documents.length > 50) {
        setError('Number of documents must be between 2 and 50');
        return;
      }
  
      onCreateCollection({
        name: collectionName,
        documents
      });
      
      setCollectionName('');
      setError('');
      onClose();
    };
  
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
      setCollectionName(e.target.value);
      if (error) setError('');
    };
  
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Create New Collection"
      >
        <div className="form-container">
          <div className="form-group">
            <label 
              htmlFor="collectionName" 
              className="form-label"
            >
              Collection Name
            </label>
            <input
              id="collectionName"
              type="text"
              value={collectionName}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Enter collection name"
            />
          </div>
  
          <div className="form-group">
            <h3 className="documents-title">
              Selected Documents ({documents.length})
            </h3>
            <div className="documents-list">
              {documents.map((doc, index) => (
                <div 
                  key={doc || index}
                  className="document-item"
                >
                  {doc || `Document ${index + 1}`}
                </div>
              ))}
            </div>
          </div>
  
          {error && (
            <p className="error-message">{error}</p>
          )}
  
          <div className="modal-actions">
            <button
              onClick={handleCreate}
              className="create-button"
              type="button"
            >
              Create Collection
            </button>
          </div>
        </div>
      </Modal>
    );
  };