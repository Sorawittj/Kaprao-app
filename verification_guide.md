# Verification Guide

## 1. P0 Bug Fixes Checklist
- [ ] **Legacy Modal**: Click on any food item (e.g., Kaprao Moo). Ensure the new "Food Sheet" (bottom sheet) opens, NOT the old centered modal.
- [ ] **Add to Cart**: Verify that "Add to Cart" works correctly from the new sheet.
- [ ] **IDs**: Check console for "Duplicate ID" errors (should be gone).
- [ ] **Slider**: Drag the points slider in Checkout. Ensure the point value updates while dragging.

## 2. P1 Order Tracker (New Feature)
- [ ] **Access**:
    - Click the new "Motorcycle" icon (Status) in the Bottom Nav.
    - OR click "Active Orders" count if visible.
- [ ] **Empty State**: If no orders, you should see a "No active orders" message with a button to Menu.
- [ ] **Active Order**:
    - Place a new order via Checkout.
    - You should see the **Order Tracking Sheet** pop up automatically.
    - Verify the **Stepper** (Pending -> Confirmed -> Preparing -> Ready).
    - Verify the **Countdown Timer** is ticking.
- [ ] **List View**:
    - Close the tracking sheet.
    - Click "Status" tab again.
    - If you have multiple orders, you should see a list of cards. Click one to see details.

## 3. P2 UI Improvements
- [ ] **Design System**: Check that colors are consistent (Amber/Indigo theme).
- [ ] **Food Cards**:
    - Menu items should look like "Premium Cards" with accurate aspect ratios.
    - Badges (New, Sold Out) should be clearly visible.
- [ ] **Navigation**:
    - Bottom Nav should have 4 tabs: Home, Status, Cart, More.
    - "Cart" tab should show a badge count.
    - "Status" tab should show a badge count for active orders.
- [ ] **Visual Noise**:
    - Verify that floating food emojis are less frequent and less distracting.

## 4. Technical
- [ ] **Console**: Check the browser console (F12) for any red errors.
