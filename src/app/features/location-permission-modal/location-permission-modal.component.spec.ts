import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocationPermissionModalComponent } from './location-permission-modal.component';

describe('LocationPermissionModalComponent', () => {
  let component: LocationPermissionModalComponent;
  let fixture: ComponentFixture<LocationPermissionModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocationPermissionModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LocationPermissionModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create modal component', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle selected mode between precise and approximate', () => {
    component.selectMode('precise');
    expect(component.selectedMode).toBe('precise');

    component.selectMode('approximate');
    expect(component.selectedMode).toBe('approximate');
  });

  it('should emit permissionGranted event with selected mode on confirm', () => {
    const spy = vi.spyOn(component.permissionGranted, 'emit');
    component.selectMode('precise');
    component.confirmPermission();
    expect(spy).toHaveBeenCalledWith({ mode: 'precise' });
  });
});
