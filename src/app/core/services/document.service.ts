import { Injectable } from '@angular/core';
import { DBSchema, openDB } from 'idb';

import { SopDocument } from '../../models/sop.model';

interface DocumentDB extends DBSchema {
  documents: {
    key: string;
    value: Blob;
  };
}

@Injectable({
  providedIn: 'root',
})
export class DocumentService {
  private readonly dbPromise = openDB<DocumentDB>('grap-document-db', 1, {
    upgrade(db) {
      db.createObjectStore('documents');
    },
  });

  async saveDocument(file: File): Promise<SopDocument> {
    const db = await this.dbPromise;

    const storageKey = crypto.randomUUID();

    const mimeType = this.getMimeType(file.name);

    const blob = file.slice(0, file.size, mimeType);

    await db.put('documents', blob, storageKey);

    return {
      name: file.name,
      mimeType,
      storageKey,
    };
  }

  async getDocument(metadata: SopDocument): Promise<Blob | null> {
    // Existing mock SOPs have no uploaded file yet.
    if (!metadata.storageKey) {
      const response = await fetch(new URL('sample-sop.pdf', document.baseURI));

      const blob = await response.blob();

      return response.ok && blob.type === 'application/pdf' ? blob : null;
    }

    const db = await this.dbPromise;

    return (await db.get('documents', metadata.storageKey)) ?? null;
  }

  async deleteDocument(storageKey: string): Promise<void> {
    const db = await this.dbPromise;

    await db.delete('documents', storageKey);
  }

  getMimeType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'pdf':
        return 'application/pdf';

      case 'doc':
        return 'application/msword';

      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      default:
        return 'application/octet-stream';
    }
  }
}
