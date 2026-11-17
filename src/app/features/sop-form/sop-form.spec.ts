import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SopForm } from './sop-form';

describe('SopForm', () => {
  let component: SopForm;
  let fixture: ComponentFixture<SopForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SopForm],
    }).compileComponents();

    fixture = TestBed.createComponent(SopForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
