import { Component, Input, OnChanges, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';

import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import * as mammoth from 'mammoth';

@Component({
  selector: 'app-document-preview',
  templateUrl: './document-preview.html',
  styleUrl: './document-preview.css',
})
export class DocumentPreviewComponent implements OnChanges, OnDestroy {
  @Input() file: Blob | null = null;
  @Input() fileName = '';

  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);

  private previewRequest = 0;

  pdfUrl: SafeResourceUrl | null = null;
  downloadUrl: string | null = null;

  wordText = '';
  previewMessage = '';
  loading = false;

  ngOnChanges(): void {
    void this.generatePreview();
  }

  private async generatePreview(): Promise<void> {
    const request = ++this.previewRequest;

    this.clearPreview();

    this.loading = false;

    if (!this.file) {
      return;
    }

    const file = this.file;

    const extension = this.fileName.split('.').pop()?.toLowerCase();

    try {
      this.loading = true;

      // Set the correct MIME type for the PDF browser viewer.
      const blob = extension === 'pdf' ? file.slice(0, file.size, 'application/pdf') : file;

      this.downloadUrl = URL.createObjectURL(blob);

      if (extension === 'pdf') {
        this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.downloadUrl);
      } else if (extension === 'docx') {
        const arrayBuffer = await file.arrayBuffer();

        const result = await mammoth.extractRawText({
          arrayBuffer,
        });

        if (request !== this.previewRequest) {
          return;
        }

        this.wordText = result.value;

        if (!this.wordText.trim()) {
          this.previewMessage = 'No readable text found. Download the document to view it.';
        }
      } else if (extension === 'doc') {
        this.previewMessage = 'Legacy Word document. Download the file to view its contents.';
      } else {
        this.previewMessage = 'Preview is unavailable.';
      }
    } catch {
      if (request === this.previewRequest) {
        this.previewMessage = 'Unable to preview this document. You can still download it.';
      }
    } finally {
      if (request === this.previewRequest) {
        this.loading = false;
        this.cdr.markForCheck();
      }
    }
  }

  private clearPreview(): void {
    if (this.downloadUrl) {
      URL.revokeObjectURL(this.downloadUrl);
    }

    this.pdfUrl = null;
    this.downloadUrl = null;
    this.wordText = '';
    this.previewMessage = '';
  }

  ngOnDestroy(): void {
    this.previewRequest++;
    this.clearPreview();
  }
}
