import { Component, ChangeDetectorRef, OnInit, inject } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { SopService } from '../../core/services/sop.service';
import { DocumentService } from '../../core/services/document.service';

import { User } from '../../models/user.model';

import { Sop, SopDocument, SopSaveMode } from '../../models/sop.model';

import { SOP_CATEGORIES } from '../../mock-data/categories.data';
import { canEditSop } from '../../core/utils/sop-permissions';

import { AppHeaderComponent } from '../../shared/components/app-header/app-header';

import { DocumentPreviewComponent } from '../../shared/components/document-preview/document-preview';

@Component({
  selector: 'app-sop-form',
  imports: [ReactiveFormsModule, AppHeaderComponent, DocumentPreviewComponent],
  templateUrl: './sop-form.html',
  styleUrl: './sop-form.css',
})
export class SopFormComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly sopService = inject(SopService);
  private readonly documentService = inject(DocumentService);

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly categories = Object.keys(SOP_CATEGORIES);

  user: User | null = null;
  existingSop: Sop | null = null;

  previewBlob: Blob | null = null;

  loading = true;
  saving = false;
  dragging = false;

  fileError = '';
  saveError = '';

  readonly maxFileSize = 10 * 1024 * 1024;

  readonly sopForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/)],
    }),

    category: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),

    subCategory: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),

    comments: new FormControl('', {
      nonNullable: true,
    }),

    document: new FormControl<File | SopDocument | null>(null, Validators.required),
  });

  // Derived properties

  get subCategories(): string[] {
    const category = this.sopForm.controls.category.value;

    return SOP_CATEGORIES[category] ?? [];
  }

  get fileName(): string {
    return this.sopForm.controls.document.value?.name ?? '';
  }

  get version(): number {
    if (!this.existingSop) {
      return 1;
    }

    const document = this.sopForm.controls.document.value;

    return document instanceof File ? this.existingSop.version + 1 : this.existingSop.version;
  }

  get isModification(): boolean {
    return this.existingSop?.status === 'Modification In Progress';
  }

  // Load user and existing SOP

  async ngOnInit(): Promise<void> {
    try {
      this.user = await firstValueFrom(this.authService.currentUser$);

      if (!this.user || this.user.role === 'Unassigned') {
        await this.router.navigate(['/login']);
        return;
      }

      const id = this.route.snapshot.paramMap.get('id');

      if (id) {
        const sop = await firstValueFrom(this.sopService.getSopById(id));

        if (!sop || !canEditSop(sop, this.user)) {
          await this.router.navigate(['/dashboard']);
          return;
        }

        this.existingSop = sop;

        this.sopForm.patchValue({
          name: sop.name,
          category: sop.category,
          subCategory: sop.subCategory,
          comments: sop.comments,
        });

        try {
          this.previewBlob = await this.documentService.getDocument(sop.document);

          if (this.previewBlob) {
            this.sopForm.controls.document.setValue(sop.document);
          } else {
            this.fileError = 'Existing document is unavailable. Please upload a replacement.';
          }
        } catch {
          this.fileError = 'Unable to retrieve the existing document. Please upload a replacement.';
        }
      }
    } catch {
      this.saveError = 'Unable to load the SOP form.';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  // Category selection

  onCategoryChange(): void {
    this.sopForm.controls.subCategory.setValue('');
  }

  // File selection

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    const file = input.files?.[0];

    if (file) {
      this.selectFile(file);
    }

    // Allows selection of the same file again.
    input.value = '';
  }

  selectFile(file: File): void {
    this.fileError = '';

    this.sopForm.controls.document.markAsTouched();

    if (!/\.(pdf|docx?)$/i.test(file.name)) {
      this.fileError = 'Only PDF and Word (.doc, .docx) files are allowed.';

      return;
    }

    if (file.size === 0) {
      this.fileError = 'The selected file is empty.';

      return;
    }

    if (file.size > this.maxFileSize) {
      this.fileError = 'File size must not exceed 10 MB.';

      return;
    }

    this.sopForm.controls.document.setValue(file);

    this.previewBlob = file;

    this.sopForm.markAsDirty();
  }

  // Drag and drop

  onDragOver(event: DragEvent): void {
    event.preventDefault();

    if (!this.saving) {
      this.dragging = true;
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();

    this.dragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();

    this.dragging = false;

    if (this.saving) {
      return;
    }

    const file = event.dataTransfer?.files[0];

    if (file) {
      this.selectFile(file);
    }
  }

  // Save Draft / Save & Submit

  async save(mode: SopSaveMode): Promise<void> {
    this.saveError = '';

    this.sopForm.markAllAsTouched();

    if (this.sopForm.invalid || this.fileError || !this.user || this.saving) {
      return;
    }

    const value = this.sopForm.getRawValue();

    if (!value.document) {
      return;
    }

    this.saving = true;

    let uploadedKey: string | undefined;

    let savedSop: Sop | null = null;

    try {
      let document: SopDocument;

      // Upload a new file into IndexedDB only when saving.
      if (value.document instanceof File) {
        document = await this.documentService.saveDocument(value.document);

        uploadedKey = document.storageKey;
      } else {
        // Keep the previously saved document.
        document = value.document;
      }

      savedSop = this.sopService.saveSop(
        {
          name: value.name,
          category: value.category,
          subCategory: value.subCategory,
          comments: value.comments,
          document,
        },
        this.user,
        mode,
        this.existingSop?.id,
      );

      if (!savedSop) {
        throw new Error('Unable to save SOP');
      }
    } catch {
      // Clean up a newly uploaded file if SOP saving failed.
      if (uploadedKey && !savedSop) {
        await this.documentService.deleteDocument(uploadedKey).catch(() => {});
      }

      this.saveError = 'Unable to save the SOP. Please try again.';
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }

    if (savedSop) {
      const message =
        savedSop.status === 'Resubmitted'
          ? 'SOP resubmitted successfully.'
          : mode === 'submit'
            ? 'SOP submitted for review successfully.'
            : 'SOP saved successfully.';

      // One-time dashboard success message.
      try {
        sessionStorage.setItem('grap-success', message);
      } catch {
        // SOP has still been saved.
      }

      await this.router.navigate(['/dashboard']);
    }
  }

  cancel(): void {
    if (!this.saving) {
      this.router.navigate(['/dashboard']);
    }
  }
}
