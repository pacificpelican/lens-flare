# Phase 6 Quick-Start Guide

## What's New

- **Image Editor**: Full-featured in-browser photo editor
- **Edit Button**: Available on every photo's detail page (✏️ icon)
- **Real-time Preview**: See all adjustments live on canvas
- **Filters**: Grayscale, Sepia, Blur, Sharpen
- **Adjustments**: Brightness, Contrast, Zoom, Rotate, Flip

## Using the Image Editor

### Opening the Editor
1. Navigate to any photo's detail page
2. Click the **✏️ Edit** button in the top-right corner
3. The editor modal opens with a preview of your photo

### Brightness & Contrast
- Use the **Brightness** slider to lighten (right) or darken (left) the image
  - 0% = completely black
  - 100% = original brightness
  - 200% = extremely bright
- Use the **Contrast** slider to adjust difference between light and dark
  - 0% = no contrast (flat gray)
  - 100% = original contrast
  - 200% = extremely high contrast

### Rotation & Flip
- **↺ 90°**: Rotate counterclockwise 90 degrees
- **↻ 90°**: Rotate clockwise 90 degrees
- **⇄ Flip**: Mirror the image horizontally (180° rotation)
- Rotations can be combined (click multiple times)

### Zoom
- **−** button: Zoom out (50% minimum)
- **+** button: Zoom in (200% maximum)
- Shows current zoom level in center

### Filters
Click any filter button to apply:
- **None**: Remove all filters (back to adjustments only)
- **B&W**: Grayscale (black and white)
- **Sepia**: Brown vintage tone
- **Blur**: Soft, blurred effect
- **Sharp**: Enhanced edges and details

Only one filter active at a time. Active filter button shows in purple.

### Saving Changes
1. When satisfied with edits, click **Save Changes** button
2. Image uploads and replaces the original
3. EXIF data and AI description automatically regenerated
4. Editor closes and you return to photo detail page
5. Refreshed photo shows new version in gallery

### Canceling Changes
- Click **Cancel** or the **✕** button to discard all edits
- Original photo is unchanged
- All adjustments are lost

### Resetting Edits
- Click **Reset** to restore all sliders to defaults
- Returns to original image state
- Useful if you want to start over without closing editor

## Examples

### Brighten a Dark Photo
1. Open editor
2. Drag **Brightness** slider to ~130-150%
3. Adjust **Contrast** to ~110% if needed
4. Click Save Changes

### Create Black & White Photo
1. Open editor
2. Click **B&W** filter
3. Optionally adjust **Contrast** for more dramatic effect
4. Click Save Changes

### Fix Tilted Horizon
1. Open editor
2. Click **↺ 90°** or **↻ 90°** repeatedly until level
3. (Crop tool coming in Phase 7 for fine adjustments)
4. Click Save Changes

### Enhance Details
1. Open editor
2. Click **Sharp** filter
3. Adjust **Contrast** to ~120% for maximum impact
4. Click Save Changes

## Tips & Tricks

### Performance
- Adjustments update instantly on canvas
- Filters take 50-200ms to apply (depending on filter)
- Save takes 200-600ms depending on image size
- Very large images (>20MB) may be slower

### Quality
- Edited photos saved as JPEG at 95% quality
- Good balance between quality and file size
- Original JPEG quality preserved unless resizing in future

### Browser Compatibility
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Requires Canvas API support (available in IE10+)
- Smooth performance on desktop; mobile works but slower on large images

### Non-Destructive Workflow
- Keep originals elsewhere if you want backup copies
- Current Phase 6 replaces original with edited version
- Crop and non-destructive layers coming in future phases

## Common Questions

**Q: Can I crop photos?**
A: Not in Phase 6. Crop tool is planned for Phase 7. For now, use rotation to fix tilted horizons.

**Q: Can I undo my changes?**
A: Within the editor, click **Reset**. After saving, changes are permanent (no version history yet).

**Q: What file formats are supported?**
A: Input: JPEG, PNG, WebP, AVIF, GIF, HEIC, Canon RAW, Nikon RAW
Output: JPEG at 95% quality (always)

**Q: Why is my edited photo the same file size?**
A: JPEG compression adjusts to content. Heavily processed images may compress differently. Size shouldn't be noticeably different.

**Q: Can I batch edit multiple photos?**
A: Not yet. Batch operations planned for future phases. Currently one photo at a time.

**Q: Where are my previous versions of the photo?**
A: Replaced in place. If you need version history, create a copy before editing (duplicate feature coming later).

## Integration with Other Features

### With EXIF Data
- Original EXIF data visible in photo detail page
- After saving edits, EXIF re-extracted from new file
- Edits in Canvas don't modify EXIF (pure re-extraction)

### With AI Descriptions
- Original AI description visible on photo detail
- After saving edits, new AI description generated for edited image
- May describe updated appearance differently

### With Tags & Metadata
- Tags are preserved when you edit a photo
- Title, description, all metadata unchanged
- Only the actual image file is replaced

### With Gallery Search
- Edited photos immediately searchable with new title/description
- Filters still work based on new EXIF if present
- Camera model, ISO may change if newly extracted

## Keyboard Shortcuts (Coming Phase 7)

Future phases may add:
- **Esc** = Close editor
- **Ctrl+Z** = Undo
- **Ctrl+Y** = Redo
- **Ctrl+S** = Save
- **R** = Rotate right
- **L** = Rotate left

## Accessibility

- All buttons have tooltip text (hover to see)
- Sliders have keyboard support (arrow keys after focus)
- Color contrasts meet WCAG AA standards
- Modal is full-screen for visibility

## Next Steps

After Phase 6 (Image Editor) is working well:
1. **Phase 7**: Crop tool and undo/redo stack
2. **Phase 8**: Batch operations and presets
3. **Phase 9**: Advanced color adjustments (saturation, hue)
