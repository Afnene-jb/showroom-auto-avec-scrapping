import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeadBar } from './head-bar';

describe('HeadBar', () => {
  let component: HeadBar;
  let fixture: ComponentFixture<HeadBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeadBar],
    }).compileComponents();

    fixture = TestBed.createComponent(HeadBar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
