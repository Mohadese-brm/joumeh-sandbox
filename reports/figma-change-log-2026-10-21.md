# Figma change log — Joumeh (CLI-002) — 2026-10-21

File: ft9A3u7cpJwySe9AfPWBBb (the backup rNqrud8M7rl3twzSdKRELI was not opened or touched).
Approved directly by Mohadeseh Ebrahim (CEO): (a) remove the heart from product cards, including the Favorites page cards (the heart stays on the PDP only); (b) archive the filter UI; (c) reviews ship using the default Figma review design (no Figma edit needed).
Editor: Emma (design). Rules: no deletions, no detaching, no page reorganization.
Before screenshots: `figma-change-2026-10-21/before/`. After screenshots: `figma-change-2026-10-21/after/`.

## 1. Checklist and before state (recorded before any edit)

### A. Card heart: hide the Favorite Toggle child (visible=false) in each card variant
The main component 266:67426 is NOT changed, so the PDP hearts 266:67491 and 266:70611 are unaffected.
Before: every child is an INSTANCE of Favorite Toggle (floating), visible=true, at x10 y10, inside a "Media" frame with layoutMode NONE (so hiding it leaves no auto-layout gap).

| Component set | Variant | Heart node | Before |
|---|---|---|---|
| Product / Card Shop 87:16741 | 87:16594 | 266:67501 | visible=true |
| | 87:16606 | 266:67506 | visible=true |
| | 87:16621 | 266:67511 | visible=true |
| | 87:16638 | 266:67516 | visible=true |
| | 87:16653 | 266:67521 | visible=true |
| | 87:16671 | 266:67526 | visible=true |
| | 87:16691 | 266:67531 | visible=true |
| | 87:16705 | 266:67536 | visible=true |
| | 87:16722 | 266:67541 | visible=true |
| Product / Card 54:187 (*) | 54:106 | 266:67546 | visible=true |
| | 54:123 | 266:67551 | visible=true |
| | 54:139 | 266:67556 | visible=true |
| | 54:153 | 266:67561 | visible=true |
| | 54:170 | 266:67566 | visible=true |
| | 54:186 | 266:67571 | visible=true |
| | 110:26141 | 266:67576 | visible=true |
| | 110:26156 | 266:67581 | visible=true |
| | 110:26173 | 266:67586 | visible=true |
| | 110:26191 | 266:67591 | visible=true |
| | 110:26211 | 266:67596 | visible=true |
| | 110:26228 | 266:67601 | visible=true |

(*) The brief named 87:16741 only. However, the Favorites page cards (for example 127:3984, 127:4005 and 127:4025 in 127:468) and most listing cards are instances of 54:187. To satisfy "every card instance, Favorites included", the same edit is applied there too.
Instance audit before the edit:
- Page 01: 184 card instances (166 of 54:187, 18 of 87:16741). 0 instance-level heart visibility overrides. 0 floating hearts outside cards.
- Page 04: 592 card instances (484 of 54:187, 108 of 87:16741). 0 overrides. 0 floating hearts outside cards.

### B. Filter sheets: move into an archive section on page 04 (04 Prototypes, 51:93)
- 69:15332 "P · Women Listing / Mobile 390 — Filter sheet": parent 252:63844 Customer Mobile Prototype, at x1300 y120, 390×844.
- 69:15505 "P · Men Listing / Mobile 390 — Filter sheet": parent 252:63844, at x3070 y120, 390×844.
- New SECTION "ARCHIVE — Filters (removed 2026-10-21)" on page 04, at absolute x27640 y7016 (empty canvas to the right of the existing section 244:60643). Nodes are moved with appendChild, so their ids, and the prototype links on them, are kept.
- Incoming prototype links into these frames (before):
  - 69:15376 Button/Filter in 69:15363 "P · Women Listing / Mobile 390 — Sort sheet": ON_CLICK → NAVIGATE → 69:15332
  - 69:15549 Button/Filter in 69:15536 "P · Men Listing / Mobile 390 — Sort sheet": ON_CLICK → NAVIGATE → 69:15505
  - There are no flow starting points on these frames.

### C. «فیلترها» button: hide on page 01
- 56:921 Women Shop / Sort Sheet / Mobile: Button/Filter 56:934, visible=true, 173×46. Parent Toolbar 56:932 is HORIZONTAL auto layout, gap 12, padding 0, width 358. Sibling Button/Sort 56:933 is 173 wide, FILL.
- 56:1968 Men Shop / Sort Sheet / Mobile: Button/Filter 56:1981, visible=true, 173×46. Parent Toolbar 56:1979 (same settings). Sibling Button/Sort 56:1980 is 173 wide, FILL.
- Expected after the edit: Sort fills 358, matching the static screen's Toolbar 56:627 / Button/Sort 56:621 (358×46).

## 2. Changes made (2026-10-21 17:54 Tehran time, UTC+3:30)

| # | Node | Change | Before → After |
|---|---|---|---|
| A1 | 21 heart children in the variants of 87:16741 (9) and 54:187 (12), ids in table A | visible | true → false |
| A2 | 10 Favorites prototype card hearts on page 04: I128:6017;266:67546, I128:6022;266:67551, I128:6027;266:67546 (128:6008 Favorites Grid Desktop); I128:6042;266:67546, I128:6047;266:67551 (128:6033 Favorites Removed Desktop); I128:8805;266:67561, I128:8810;266:67566, I128:8815;266:67561 (128:8797 Favorites Grid Mobile); I128:8828;266:67561, I128:8833;266:67566 (128:8820 Favorites Removed Mobile) | instance-level visible (no detach) | true → false. These cards did NOT follow the component change because they held an instance override that kept the heart visible, so each was set explicitly. |
| B1 | New SECTION 334:81769 "ARCHIVE — Filters (removed 2026-10-21)", page 04, x27640 y7016, 1020×1044 | created | none → created |
| B2 | 69:15332 Women Filter sheet | moved (appendChild) | parent 252:63844 at x1300 y120 → parent 334:81769 at x80 y120. Same id. |
| B3 | 69:15505 Men Filter sheet | moved (appendChild) | parent 252:63844 at x3070 y120 → parent 334:81769 at x550 y120. Same id. |
| C1 | 56:934 Button/Filter in 56:921 | visible | true → false |
| C2 | 56:1981 Button/Filter in 56:1968 | visible | true → false |

Nothing was deleted or detached, the main component 266:67426 was not modified, and no pages were reorganized.

## 3. Verification (get_screenshot plus a plugin re-read after the edits)
- Page 01: 184 card instances. 0 visible Favorite Toggles inside cards. The Favorites cards 127:3984, 127:4005, 127:4025, 127:4157, 127:4178 and 127:5745 show no heart; their re-read shows no Favorite Toggle child at all. The PDP hearts 266:67491 and 266:70611 (Outline) are still visible=true.
- Page 04: 592 card instances (count unchanged). 0 visible card hearts. The only visible Favorite Toggles left outside cards are 28 Outline (PDP-style) instances; there are no Floating card hearts.
- Toolbars 56:932 and 56:1979: Button/Sort 56:933 and 56:1980 are now 358 wide at x0 and fill the toolbar, the same as 56:621 on the static screen. No gap is left (the hidden child takes no space in auto layout), so no manual fix was needed. Confirmed in the after screenshots.
- Section 334:81769 sits on page 04 (51:93) and contains exactly 69:15332 and 69:15505. Each frame still has 28 nodes with reactions.
- Incoming prototype links (still intact after the move):
  - 69:15376 Button/Filter in 69:15363 "P · Women Listing / Mobile 390 — Sort sheet": ON_CLICK → NAVIGATE → 69:15332
  - 69:15549 Button/Filter in 69:15536 "P · Men Listing / Mobile 390 — Sort sheet": ON_CLICK → NAVIGATE → 69:15505
  - The source buttons are still visible in the live prototype, so the prototype still navigates into the archived sheets. Hiding or unlinking them was outside the approved scope; open for decision.
- Screenshots: before/ (7 files) and after/ (7 files, including favorites-mobile-proto-128_8797.png and archive-section-334_81769.png).
- (c) Reviews: no Figma change was needed; the build should use the default review design.

## 4. Follow-up: prototype filter buttons (2026-10-21 17:55 Tehran time)
Approved as part of archiving the filters.

| Node | Frame | Change | Before → After |
|---|---|---|---|
| 69:15376 Button/Filter | 69:15363 P · Women Listing / Mobile 390 — Sort sheet | visible | true → false (its 3 reactions are kept, including ON_CLICK → 69:15332) |
| 69:15549 Button/Filter | 69:15536 P · Men Listing / Mobile 390 — Sort sheet | visible | true → false (its 3 reactions are kept, including ON_CLICK → 69:15505) |

- Scan of page 04 before the edit: there are only 4 Button/Filter nodes. The 2 above were the only ones in live prototype frames; the mobile listing frames themselves have none. The other 2, 69:15345 and 69:15518, are inside the archived sheets 69:15332 and 69:15505 and were left as they are, as part of the archived reference.
- Sort buttons 69:15375 and 69:15548 are now 358 wide at x0 and fill the toolbar, matching 56:621. Confirmed in after/proto-sort-women-69_15363.png and after/proto-sort-men-69_15536.png.
- Re-read: on page 04, only 69:15376 and 69:15549 have a reaction pointing to 69:15332 or 69:15505, and both are now hidden. No visible element navigates to the archived frames.
- Note: visible filter text is still present in the ADMIN — INTERACTIVE PROTOTYPE section (for example «فیلترهای بیشتر» and «پاک کردن فیلترها»). That is the admin panel's own list filtering, not the customer storefront filter, and it was not changed.
