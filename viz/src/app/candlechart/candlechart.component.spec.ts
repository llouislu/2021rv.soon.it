import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CandlechartComponent } from './candlechart.component';

describe('CandlechartComponent', () => {
  let component: CandlechartComponent;
  let fixture: ComponentFixture<CandlechartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CandlechartComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CandlechartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
