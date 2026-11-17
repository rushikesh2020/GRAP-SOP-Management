import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SopDetail } from './sop-detail';

describe('SopDetail', () => {
  let component: SopDetail;
  let fixture: ComponentFixture<SopDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SopDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(SopDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
