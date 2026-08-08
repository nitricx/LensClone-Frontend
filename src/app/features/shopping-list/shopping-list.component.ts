import { Component, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShoppingListService, ShoppingListItem } from '../../services/shopping-list/shopping-list.service';

@Component({
  selector: 'app-shopping-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './shopping-list.component.html',
  styleUrl: './shopping-list.component.css',
})
export class ShoppingListComponent {
  readonly newItemName = signal('');
  readonly newItemQty = signal(1);
  readonly newItemPrice = signal<number | null>(null);

  readonly presets = [
    { name: 'Organic Milk 1L', qty: 1 },
    { name: 'Large Eggs 12-pack', qty: 1 },
    { name: 'Whole Wheat Bread', qty: 1 },
    { name: 'Ground Coffee 250g', qty: 1 },
    { name: 'Bananas 1kg', qty: 1 },
  ];

  constructor(readonly shoppingList: ShoppingListService) {}

  addItem(): void {
    const name = this.newItemName().trim();
    if (!name) return;

    const qty = this.newItemQty();
    const price = this.newItemPrice();

    this.shoppingList.addItem(name, qty, price ?? undefined);

    // Reset inputs
    this.newItemName.set('');
    this.newItemQty.set(1);
    this.newItemPrice.set(null);
  }

  addPreset(name: string, qty: number): void {
    this.shoppingList.addItem(name, qty);
  }

  updateQty(item: ShoppingListItem, delta: number): void {
    this.shoppingList.updateQuantity(item.id, item.quantity + delta);
  }

  onPriceChange(item: ShoppingListItem, event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = Number.parseFloat(input.value);
    if (!Number.isNaN(val) && val > 0) {
      this.shoppingList.updateUnitPrice(item.id, val);
    } else {
      this.shoppingList.updateUnitPrice(item.id, undefined);
    }
  }
}
