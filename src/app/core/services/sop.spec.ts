import { TestBed } from '@angular/core/testing';
import { Sop } from './sop';

describe('Sop', () => {
  let service: Sop;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Sop);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
