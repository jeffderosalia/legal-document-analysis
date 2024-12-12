export interface Document {
    id: string;
    name: string;
    type: 'file' | 'folder';
    children?: Document[];
  }
  
  export interface Message {
    type: 'user' | 'assistant';
    content: string;
  }
  
  export interface DocumentNode extends Document {
    children: DocumentNode[];
  }