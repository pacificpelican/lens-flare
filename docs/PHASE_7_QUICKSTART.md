# Phase 7 Quick-Start Guide

## What's New in Phase 7

- **Undo/Redo**: Full history stack with keyboard shortcuts
- **Crop Tool**: Professional crop selection with aspect ratio constraints
- **Color Adjustments**: Saturation and Hue for creative control
- **Enhanced UX**: Better organized toolbar, history buttons, escape key support

## Undo/Redo System ↶↷

### Using Undo/Redo
- **Undo Button** (↶): Click to revert last edit
- **Redo Button** (↷): Click to re-apply after undo
- **Keyboard Shortcuts**:
  - `Ctrl+Z` or `Cmd+Z` = Undo
  - `Ctrl+Y` or `Cmd+Y` = Redo
  - `Shift+Ctrl+Z` = Redo (alternative)

### How It Works
- Every adjustment, filter, crop, and rotation is saved in history
- Unlimited undo/redo (no limit on history depth)
- Buttons gray out when no action available
- Keyboard shortcuts work anywhere in the editor
- Redo history clears when you make a new edit (standard behavior)

### Examples
1. Adjust brightness → Undo returns to original
2. Apply filter → Undo removes filter → Redo reapplies filter
3. Crop image → Undo → Different crop → Redo history cleared
4. 50 edits → Undo 10 times → Redo 5 times = 45 edits active

## Crop Tool ✂️

### Entering Crop Mode
1. Click **✂️ Crop** button in Transform section
2. Canvas switches to crop mode (semi-transparent overlay)
3. Toolbar shows aspect ratio buttons and crop section

### Making a Selection
1. **Click and drag** on the image to select crop region
2. See **purple border** around your selection
3. **Corner handles** show where corners are
4. Selection follows aspect ratio (if constrained)

### Aspect Ratios
- **Free**: Any rectangular shape (no constraints)
- **1:1**: Perfect square (social media profiles)
- **16:9**: Widescreen (landscape videos, modern displays)
- **4:3**: Classic photo ratio (standard prints)

Click button to select aspect ratio before or during selection.

### Applying Crop
1. When satisfied with selection, click **Apply Crop**
2. Crop region locks in and is immediately visible
3. All subsequent adjustments/filters apply to cropped area
4. Crop saved in history (can undo!)
5. Can combine crop with rotation, filters, everything else

### Canceling Crop
- Press **Escape** to exit crop mode without applying
- Or close editor without clicking Apply Crop
- Original image unchanged

### Tips
- Crop doesn't remove pixels until final save
- Can undo crop and try again
- Combine crop + rotation for tilted photo fixes
- Apply crop before heavy filters for better performance

## Color Adjustments 🎨

### Saturation Slider
**Range**: 0-200% (default 100%)

- **0%**: Completely black and white (no color)
- **50%**: Muted, pastel colors
- **100%**: Original saturation (default)
- **150%**: Enhanced, vibrant colors
- **200%**: Over-saturated, almost cartoon-like

**Use For**:
- Desaturate for black & white effect (use 0%)
- Enhance colors in muted photos (use 120-150%)
- Tone down oversaturated photos (use 70-90%)

**Examples**:
- Sunset photo: Increase to 130% for more vibrant colors
- Washed-out landscape: Increase to 140-160%
- High-contrast shot: Reduce to 80% for subtlety

### Hue Shift Slider
**Range**: -180° to +180° (default 0°)

Rotates all colors around the color wheel. Think of it as a "color spin."

**Common Values**:
- **-180° / +180°**: Inverts all colors (red→cyan, blue→yellow)
- **-120°**: Shifts red→blue, yellow→red, green→yellow
- **-60°**: Subtle color shift one direction
- **0°**: Original colors (default)
- **+60°**: Subtle color shift other direction
- **+120°**: Shifts red→green, blue→red, yellow→cyan

**Use For**:
- Creative color effects
- Converting blue sky to orange
- Artistic color grading
- Correcting color casts (warm/cool tones)

**Examples**:
- Blue sky photo: +120° shift makes it orange
- Red object: -120° shift makes it cyan
- Sunset: Adjust hue to change mood (warmer/cooler)

## New Toolbar Layout

### Adjustments Section
- Brightness
- Contrast
- **Saturation** (NEW)
- **Hue Shift** (NEW)
- Zoom

### Transform Section
- Rotate Left/Right
- **Crop Button** (NEW)

### Filters Section
- None
- B&W (Grayscale)
- Sepia
- Blur
- Sharp

## Workflow Example: Professional Photo Edit

1. **Open editor** on underexposed sunset photo
2. **Undo/Redo not needed yet**, but available
3. **Brightness**: Increase to 120%
4. **Contrast**: Increase to 110%
5. **Saturation**: Increase to 140% (vibrant colors)
6. **Hue Shift**: +30° to make colors warmer
7. **Crop Tool**: Select 16:9 aspect ratio
8. **Drag to select** horizon in middle third (rule of thirds)
9. **Apply Crop**: Removes edges, focuses on sunset
10. **Result**: Professional-looking photo
11. **Undo**: If not happy with crop, undo and try again
12. **Save Changes**: Upload edited version

Total time: 2-3 minutes!

## Keyboard Shortcuts Cheat Sheet

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Shift+Ctrl+Z` | Redo (alternative) |
| `Escape` | Cancel crop mode |

## Tips & Tricks

### Performance
- Hue/Saturation adjustments take ~50-150ms (normal)
- Very large images (20MB+) may take longer
- Crop mode fast because no full image processing
- Undo/redo instant (no re-processing)

### Quality
- Saturation/Hue adjustments preserve quality
- Use before/after filter for best results
- Combine with brightness/contrast for dramatic effects
- Saturation + desaturated image = very subtle change

### Common Issues

**Q: Hue shift doesn't seem to work?**
A: It's very subtle on already-desaturated images. Increase saturation first, then adjust hue.

**Q: Crop button not working?**
A: Make sure you've clicked it (background should be yellow). Try pressing Escape and trying again.

**Q: Undo button grayed out?**
A: You're at the beginning of history. No edits to undo yet. Keep editing!

**Q: Saturation at 0% looks wrong?**
A: That's correct! 0% removes all color = pure grayscale. Use 80-90% for subtle desaturation.

## Integration with Other Features

### Undo/Redo with Filters
- Undo after applying grayscale? Back to original colors
- Redo history clears if you apply different filter

### Crop + Rotation
- Rotate image first, then crop
- Or crop first, then rotate
- Both preserved in history

### Saturation + Sepia Filter
- Sepia filter removes saturation
- Increasing saturation after sepia adds warmth back
- Nice effect for vintage-looking photos

### Hue + Grayscale
- Hue shift on grayscale has no effect (no colors)
- Apply hue shift, then remove grayscale to see effect

## Next Phase (Phase 8)

Planned features:
- Preset library (save favorite adjustments)
- More advanced color tools (levels, curves)
- Batch editing (apply to multiple photos)
- Export options (PNG, WebP, TIFF)

## Troubleshooting

**Server Issues**
- Backend: http://localhost:3000
- Frontend: http://localhost:5173
- If pages not loading, check dev server console

**Crop Won't Apply**
- Make sure you've made a selection (see purple border)
- Click Apply Crop button
- If still stuck, press Escape and try again

**Undo/Redo Not Working**
- Check console for errors (F12 in browser)
- Refresh page if stuck
- Clear browser cache if needed

**Very Slow Performance**
- Very large images (>20MP) expected to be slower
- Close other browser tabs
- Reduce zoom level before heavy adjustments
- Use crop tool to work on smaller region

## Accessibility

- All buttons have tooltip text (hover to see)
- Keyboard shortcuts for power users
- Color contrasts meet accessibility standards
- Tab navigation works through all controls
