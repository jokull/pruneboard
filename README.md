# Pruneboard

A Raycast extension that analyzes clipboard content by mimetype and allows you to prune unwanted formats.

## The Problem

When copying images from Chrome or Safari, the clipboard often contains multiple formats:
- The actual image data (PNG, JPEG, etc.)
- A text URL pointing to the image source
- HTML markup
- Other metadata

Sometimes you just want the image itself, not the URL or other formats.

## What This Extension Does

1. **Analyzes Clipboard**: Shows all mimetypes currently in your clipboard
2. **Visual Breakdown**: Displays each format with appropriate icons and readable names
3. **Live Previews**: See image and text content directly in the detail panel
4. **Prune to Single Type**: Lets you keep only the mimetype you want, removing all others

## Usage

1. Copy something to your clipboard (e.g., an image from a web browser)
2. Open Raycast and run the "Show Clipboard Mimetypes" command
3. Browse the list of available mimetypes with live previews
4. Press Enter on the mimetype you want to keep
5. All other mimetypes are removed from the clipboard

## Features

### Live Previews
- **Image Preview**: Images are displayed directly in the detail panel
- **Text Preview**: Text content is shown with syntax highlighting
- **Toggle View**: Press ⌘D to show/hide the detail panel

### Actions
- **Keep Only This Type** (Enter): Removes all other mimetypes from clipboard
- **Show/Hide Preview** (⌘D): Toggles the detail panel
- **Copy Type Name** (⌘C): Copies the technical mimetype identifier
- **Refresh** (⌘R): Reloads the current clipboard contents

## Installation

### Local Installation (Without Publishing)

1. Clone this repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Build the extension:
   ```bash
   pnpm build
   ```
4. Import into Raycast:
   - Open Raycast preferences (⌘,)
   - Go to Extensions tab
   - Click the "+" button
   - Select "Add Script Directory" or "Import Extension"
   - Navigate to the `dist` folder in this project

The extension will now be available in Raycast without needing to run `pnpm dev`.

## Development

```bash
# Start development mode (live reload)
pnpm dev

# Build for production
pnpm build

# Lint code
pnpm lint
```

## Technical Details

This extension uses macOS's NSPasteboard API via JavaScript for Automation (JXA) to:
- Query all available types in the clipboard
- Read and preview data for specific types (images and text)
- Write back only the selected type

### Preview Support
- **Images**: PNG, JPEG, TIFF, GIF - displayed as images
- **Text**: Plain text, HTML, URLs - displayed as formatted code blocks
- Images are temporarily saved to `/tmp` for preview rendering
- Text is limited to 5000 characters for performance

### Common Mimetypes
- `public.png` / `public.jpeg` - Image data
- `public.utf8-plain-text` - Plain text
- `public.html` - HTML content
- `public.rtf` - Rich text
- `public.url` / `public.file-url` - URLs

## Icon

The placeholder icon should be replaced with a proper 512x512px PNG icon. You can create one at [assets/icon.png](./assets/icon.png).

## License

MIT
