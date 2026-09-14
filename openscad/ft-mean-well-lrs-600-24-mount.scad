// FT EMS Mount - Mean Well LRS-600-24
// Frame-style mount matching FT EMS design language
// PSU body: 225mm(L) x 144mm(W) x 41mm(H)
// Bottom M4 mounting holes: 150mm(L) x 124mm(W) center-to-center pattern

// ── Plate dimensions ─────────────────────────────────────────────────────────
plate_w   = 152;   // overall width  (PSU width 144 + 4mm each side)
plate_l   = 233;   // overall length (PSU length 225 + 4mm each side)
plate_h   = 7;     // thickness — standard FT EMS

// ── Central cutout ───────────────────────────────────────────────────────────
cutout_w  = 110;   // central void width  (~21mm border on each side)
cutout_l  = 190;   // central void length (~21mm border each end)
cutout_r  = 5;     // corner radius of cutout

// ── Corner bosses ─────────────────────────────────────────────────────────────
boss_dia    = 12;          // raised pad diameter
boss_h      = 2;           // height above plate surface
boss_x      = plate_w/2 - 7;   // 69mm from centre (7mm inset from edge)
boss_y      = plate_l/2 - 7;   // 109.5mm from centre
boss_hole_d = 3.4;         // M3 clearance hole

// ── PSU mounting slots ───────────────────────────────────────────────────────
// LRS-600-24 M4 pattern: 150mm(L) x 124mm(W) centred on plate
psu_x     = 62;    // half of 124mm = 62mm from centre (left/right rails)
psu_y     = 75;    // half of 150mm = 75mm from centre (top/bottom)

// Slots: oblong/stadium shape for ±5mm adjustment tolerance
slot_len  = 40;    // length of oblong slot (direction of adjustment)
slot_w    = 5;     // slot width (M4 = 4mm, 5mm clearance)

// Side-rail vertical slots: 3 per side, spaced along Y
slot_y_offsets = [-50, 0, 50];  // Y positions of the 3 vertical slots

$fn = 64;

// ── Helper: rounded rectangle (2D) ──────────────────────────────────────────
module rrect(w, l, r) {
    offset(r=r) square([w - 2*r, l - 2*r], center=true);
}

// ── Oblong / stadium slot (2D) ───────────────────────────────────────────────
// len = full length, w = width; slot runs along Y axis
module slot_2d(len, w) {
    r = w / 2;
    hull() {
        translate([0,  (len - w) / 2]) circle(r=r);
        translate([0, -(len - w) / 2]) circle(r=r);
    }
}

// ── Corner bosses (solid raised pads) ────────────────────────────────────────
module corner_bosses() {
    for (sx = [-1, 1])
        for (sy = [-1, 1])
            translate([sx * boss_x, sy * boss_y, plate_h])
                cylinder(h = boss_h, d = boss_dia);
}

// ── M3 holes through bosses and plate ────────────────────────────────────────
module corner_boss_holes() {
    for (sx = [-1, 1])
        for (sy = [-1, 1])
            translate([sx * boss_x, sy * boss_y, -1])
                cylinder(h = plate_h + boss_h + 2, d = boss_hole_d);
}

// ── Large central rectangular cutout ─────────────────────────────────────────
module center_cutout() {
    translate([0, 0, -1])
        linear_extrude(plate_h + 2)
            rrect(cutout_w, cutout_l, cutout_r);
}

// ── PSU M4 mounting slots ─────────────────────────────────────────────────────
module psu_slots() {
    // Top horizontal slot (runs along X — rotate 90°)
    translate([0, psu_y, -1]) rotate([0, 0, 90])
        linear_extrude(plate_h + 2) slot_2d(slot_len, slot_w);

    // Bottom horizontal slot
    translate([0, -psu_y, -1]) rotate([0, 0, 90])
        linear_extrude(plate_h + 2) slot_2d(slot_len, slot_w);

    // Left rail: 3 vertical slots
    for (y = slot_y_offsets)
        translate([-psu_x, y, -1])
            linear_extrude(plate_h + 2) slot_2d(slot_len, slot_w);

    // Right rail: 3 vertical slots
    for (y = slot_y_offsets)
        translate([psu_x, y, -1])
            linear_extrude(plate_h + 2) slot_2d(slot_len, slot_w);
}

// ── Debossed label text ───────────────────────────────────────────────────────
module debossed_text() {
    // Placed on the right rail, running vertically (rotated 90°)
    translate([boss_x - 3, 0, plate_h - 0.5])
        rotate([0, 0, 90])
            linear_extrude(1.0)
                text("MEAN WELL LRS-600-24", size = 5,
                     halign = "center", valign = "center",
                     font = "Liberation Sans:style=Bold");
}

// ── Main geometry ─────────────────────────────────────────────────────────────
difference() {
    union() {
        // Main plate with slightly rounded corners
        linear_extrude(plate_h)
            rrect(plate_w, plate_l, 3);

        // Raised corner bosses
        corner_bosses();
    }

    // Hollow out the centre
    center_cutout();

    // PSU M4 mounting slots (oblong for adjustment tolerance)
    psu_slots();

    // M3 FT EMS standoff holes through bosses
    corner_boss_holes();

    // Debossed model label on right rail
    debossed_text();
}
