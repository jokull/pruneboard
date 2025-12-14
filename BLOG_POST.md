# Pruneboard: Clipboard Mimetype Management for macOS

The macOS clipboard stores content in multiple formats simultaneously. Copy an image from Chrome and you'll get the PNG data, the source URL as text, HTML markup, and potentially more. This is usually helpful but occasionally you only want one specific format.

## The Problem

When pasting into different applications, the receiving app picks what it considers the "best" format from the available options. Sometimes this doesn't match what you want. For example:

- Copy an image from a browser
- Paste into Slack
- Slack chooses the URL text instead of the image data
- You end up with a link instead of an embedded image

The clipboard itself is fine - it contains both formats. But you can't easily tell the target application which one to prefer.

## Implementation

Built this as a Raycast extension because Raycast provides good UI primitives and I already have it open constantly. The extension uses macOS's NSPasteboard API through JavaScript for Automation (JXA).

Key components:

1. **Reading pasteboard types**: Query `NSPasteboard.generalPasteboard.types` to enumerate all available formats
2. **Preview generation**: For images, extract data and write to `/tmp` for rendering. For text, call `stringForType` and limit to 5000 chars
3. **Pruning**: Read the data for the selected type, clear the pasteboard, write back only that type

The tricky part was getting JXA syntax right for the pasteboard API. Had to use `osascript -l JavaScript` to execute snippets that interact with NSPasteboard, then bridge the results back to Node.

## Usage

Open Raycast, type "Show Clipboard Mimetypes", see a list of all formats currently in the clipboard with live previews. Press Enter on the one you want to keep. All other formats get removed.

Useful when:
- Copying images from browsers and want to ensure only image data persists
- Dealing with rich text that you want to convert to plain text
- Debugging clipboard-related issues to see exactly what's stored

## Technical Notes

UTI (Uniform Type Identifier) strings like `public.png` or `public.utf8-plain-text` are macOS's way of identifying data types. The extension maps common UTIs to human-readable names and appropriate icons.

Image preview requires writing to disk because Raycast's markdown preview expects file paths for images. Text preview is simpler - just embed in a code block.

The extension only handles text and image types. Other formats (like RTF or proprietary types) show up in the list but can't be previewed or pruned.

## Building

Standard Raycast extension setup:

```bash
pnpm install
pnpm build
```

Then import the `dist` folder in Raycast preferences under Extensions. No need to publish to the Raycast store for personal use.

Source: https://github.com/jokull/pruneboard
