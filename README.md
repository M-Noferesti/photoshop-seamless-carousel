# Monstizo Seamless Carousel for Photoshop

A modern CEP panel for building and exporting seamless Instagram carousels.

## Features

- Square (1:1), portrait (4:5), and story (9:16) presets
- 2–20 slides with a live canvas preview
- Custom dimensions, resolution, background, and safe margin
- Slide-boundary and safe-area guides
- Individual color picker for every slide boundary and a separate safe-area guide color
- Optional organized slide groups and labels
- Non-destructive guide setup for existing artwork
- Batch PNG or JPEG export with quality and filename controls
- One-click **Export slides separately** button directly on the Create screen
- **Update current carousel** resizes the active canvas and refreshes its complete guide setup without scaling artwork
- Persistent panel preferences and keyboard shortcuts

## Open in Photoshop

Restart Photoshop after installation, then choose **Window → Extensions (Legacy) → Seamless Carousel**.

If Photoshop was open while the extension was copied, a full restart is required. The included `install.ps1` installs the panel for the current user and enables unsigned CEP development mode. Run it with `-SystemWide` in an elevated PowerShell window to also install into the shared Adobe CEP directory.

## Workflow

1. Pick a format and slide count, then create the carousel document.
2. Design continuously across the vertical slide guides.
3. Choose PNG or JPG and export all slides. Guide labels are hidden automatically.

The export process duplicates and crops the document in memory, so the original layered document remains intact.
