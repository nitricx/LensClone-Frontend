import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PriceHeatmapComponent } from './price-heatmap.component';

describe('PriceHeatmapComponent', () => {
  let component: PriceHeatmapComponent;
  let fixture: ComponentFixture<PriceHeatmapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PriceHeatmapComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PriceHeatmapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and initialize in groceryList mode', () => {
    expect(component).toBeTruthy();
    expect(component.activeMode()).toBe('groceryList');
  });

  it('should switch heatmap modes', () => {
    component.setMode('productFilter');
    expect(component.activeMode()).toBe('productFilter');

    component.setMode('categoryFilter');
    expect(component.activeMode()).toBe('categoryFilter');
  });

  it('should calculate store summaries and identify best store', () => {
    const best = component.bestStore();
    expect(best).toBeTruthy();
    expect(best?.status).toBe('best');
  });
});
