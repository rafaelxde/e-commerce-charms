import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Loja } from './loja';

describe('Loja', () => {
  let component: Loja;
  let fixture: ComponentFixture<Loja>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Loja]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Loja);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
