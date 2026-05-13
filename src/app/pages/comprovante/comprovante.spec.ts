import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Comprovante } from './comprovante';

describe('Comprovante', () => {
  let component: Comprovante;
  let fixture: ComponentFixture<Comprovante>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Comprovante]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Comprovante);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
