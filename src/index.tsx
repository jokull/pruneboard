import { Action, ActionPanel, List, showToast, Toast, Clipboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface MimetypeItem {
  type: string;
  displayName: string;
  icon: string;
  preview?: string;
  previewType?: "text" | "image" | "none";
}

async function getClipboardTypes(): Promise<MimetypeItem[]> {
  try {
    // Use JavaScript for Automation to query the pasteboard types
    const script = `
      ObjC.import('AppKit');
      var pb = $.NSPasteboard.generalPasteboard;
      var types = pb.types;
      var typeList = [];
      for (var i = 0; i < types.count; i++) {
        typeList.push(ObjC.unwrap(types.objectAtIndex(i)));
      }
      typeList.join(', ');
    `;

    const { stdout } = await execAsync(`osascript -l JavaScript -e '${script.replace(/'/g, "'\\''")}'`);

    if (!stdout.trim()) {
      return [];
    }

    // Parse the output - it comes as comma-separated values
    const types = stdout
      .trim()
      .split(", ")
      .filter((t) => t.length > 0)
      .map((type) => {
        // Clean up the type string
        const cleanType = type.trim();

        // Determine icon based on type
        let icon = "📋";
        let displayName = cleanType;

        // Common type mappings
        if (cleanType.includes("image") || cleanType.includes("png") || cleanType.includes("jpeg") || cleanType.includes("tiff")) {
          icon = "🖼️";
        } else if (cleanType.includes("text") || cleanType.includes("string")) {
          icon = "📝";
        } else if (cleanType.includes("html")) {
          icon = "🌐";
        } else if (cleanType.includes("rtf")) {
          icon = "📄";
        } else if (cleanType.includes("url")) {
          icon = "🔗";
        } else if (cleanType.includes("file")) {
          icon = "📁";
        }

        // Simplify display name for common types
        if (cleanType === "public.utf8-plain-text") {
          displayName = "Plain Text (UTF-8)";
        } else if (cleanType === "public.html") {
          displayName = "HTML";
        } else if (cleanType === "public.rtf") {
          displayName = "Rich Text (RTF)";
        } else if (cleanType === "public.png") {
          displayName = "PNG Image";
        } else if (cleanType === "public.jpeg") {
          displayName = "JPEG Image";
        } else if (cleanType === "public.tiff") {
          displayName = "TIFF Image";
        } else if (cleanType === "public.url") {
          displayName = "URL";
        } else if (cleanType === "public.file-url") {
          displayName = "File URL";
        }

        return {
          type: cleanType,
          displayName,
          icon,
        };
      });

    return types;
  } catch (error) {
    console.error("Error getting clipboard types:", error);
    throw new Error(`Failed to get clipboard types: ${error}`);
  }
}

async function getPreviewForType(type: string, displayName: string): Promise<{ preview?: string; previewType?: "text" | "image" | "none" }> {
  try {
    const isImage = type.includes("image") || type.includes("png") || type.includes("jpeg") || type.includes("tiff") || type.includes("gif");
    const isText = type.includes("text") || type.includes("string") || type.includes("html") || type.includes("url");

    // Escape the type string for use in shell commands
    const escapedType = type.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

    if (isImage) {
      // Get image data and save to temp file
      const timestamp = Date.now();
      const script = `
        ObjC.import('AppKit');
        var pb = $.NSPasteboard.generalPasteboard;
        var imageData = pb.dataForType("${escapedType}");

        if (!imageData || imageData.isNil()) {
          'ERROR';
        } else {
          var tempPath = '/tmp/raycast_clipboard_preview_${timestamp}.png';
          imageData.writeToFileAtomically(tempPath, true);
          tempPath;
        }
      `;

      const { stdout } = await execAsync(`osascript -l JavaScript -e '${script.replace(/'/g, "'\\''")}'`);

      if (stdout.includes("ERROR") || !stdout.trim()) {
        return { previewType: "none" };
      }

      const imagePath = stdout.trim();
      return {
        preview: imagePath,
        previewType: "image",
      };
    } else if (isText) {
      // Get text data
      const script = `
        ObjC.import('AppKit');
        var pb = $.NSPasteboard.generalPasteboard;
        var str = pb.stringForType("${escapedType}");

        if (!str || str.isNil()) {
          'ERROR';
        } else {
          ObjC.unwrap(str);
        }
      `;

      const { stdout } = await execAsync(`osascript -l JavaScript -e '${script.replace(/'/g, "'\\''")}'`);

      if (stdout.includes("ERROR") || !stdout.trim()) {
        return { previewType: "none" };
      }

      const textContent = stdout.trim();
      // Limit text preview to 5000 characters
      const preview = textContent.length > 5000 ? textContent.substring(0, 5000) + "..." : textContent;

      return {
        preview,
        previewType: "text",
      };
    }

    return { previewType: "none" };
  } catch (error) {
    console.error(`Error getting preview for ${type}:`, error);
    return { previewType: "none" };
  }
}

async function copySpecificType(type: string): Promise<void> {
  try {
    const isImage = type.includes("image") || type.includes("png") || type.includes("jpeg") || type.includes("tiff") || type.includes("gif");
    const isText = type.includes("text") || type.includes("string") || type.includes("html") || type.includes("url");

    if (isImage) {
      // For images: save to temp file and recopy via Raycast Clipboard API
      const timestamp = Date.now();
      const tempPath = `/tmp/raycast_clipboard_${timestamp}.png`;

      // Save image data to temp file using multiple -e flags with double quotes
      await execAsync(
        `osascript -e "use framework \\"AppKit\\"" ` +
        `-e "set pb to current application's NSPasteboard's generalPasteboard()" ` +
        `-e "set imageData to pb's dataForType:\\"${type}\\""` +
        ` -e "if imageData is not missing value then" ` +
        `-e "  imageData's writeToFile:\\"${tempPath}\\" atomically:true" ` +
        `-e "end if"`
      );

      // Recopy the file using Raycast's Clipboard API
      await Clipboard.copy({ file: tempPath });

      await showToast({
        style: Toast.Style.Success,
        title: "Clipboard Updated",
        message: `Now contains only: ${type}`,
      });
    } else if (isText) {
      // For text: read text and recopy via Raycast Clipboard API
      const { stdout } = await execAsync(
        `osascript -e "use framework \\"AppKit\\"" ` +
        `-e "set pb to current application's NSPasteboard's generalPasteboard()" ` +
        `-e "set str to pb's stringForType:\\"${type}\\""` +
        ` -e "if str is not missing value then" ` +
        `-e "  return str as text" ` +
        `-e "end if"`
      );

      if (!stdout.trim()) {
        throw new Error("Could not read text content");
      }

      // Recopy the text using Raycast's Clipboard API
      await Clipboard.copy(stdout.trim());

      await showToast({
        style: Toast.Style.Success,
        title: "Clipboard Updated",
        message: `Now contains only: ${type}`,
      });
    } else {
      throw new Error("Unsupported type - only images and text are supported");
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Update Clipboard",
      message: String(error),
    });
  }
}

export default function Command() {
  const [types, setTypes] = useState<MimetypeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [showDetail, setShowDetail] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadTypes = async () => {
    try {
      setIsLoading(true);
      setError(undefined);
      const clipboardTypes = await getClipboardTypes();

      // Load previews for each type
      const typesWithPreviews = await Promise.all(
        clipboardTypes.map(async (item) => {
          const { preview, previewType } = await getPreviewForType(item.type, item.displayName);
          return {
            ...item,
            preview,
            previewType,
          };
        })
      );

      setTypes(typesWithPreviews);
    } catch (err) {
      setError(String(err));
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Clipboard",
        message: String(err),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTypes();
  }, [refreshKey]);

  return (
    <List isLoading={isLoading} isShowingDetail={showDetail && types.length > 0 && !error}>
      {error ? (
        <List.EmptyView
          icon="⚠️"
          title="Error Loading Clipboard"
          description={error}
        />
      ) : types.length === 0 ? (
        <List.EmptyView
          icon="📋"
          title="Clipboard is Empty"
          description="Copy something to your clipboard and try again"
        />
      ) : (
        types.map((item) => {
          const renderPreview = () => {
            if (!item.preview || item.previewType === "none") {
              return "No preview available for this type.";
            }

            if (item.previewType === "image") {
              return `![${item.displayName}](${item.preview})`;
            }

            if (item.previewType === "text") {
              return `\`\`\`\n${item.preview}\n\`\`\``;
            }

            return "No preview available.";
          };

          return (
            <List.Item
              key={item.type}
              icon={item.icon}
              title={item.displayName}
              detail={
                <List.Item.Detail
                  markdown={renderPreview()}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Mimetype" text={item.type} />
                      <List.Item.Detail.Metadata.Label title="Display Name" text={item.displayName} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Preview Type"
                        text={item.previewType || "none"}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Keep Only This Type"
                    icon="✂️"
                    onAction={() => copySpecificType(item.type)}
                  />
                  <Action
                    title={showDetail ? "Hide Preview" : "Show Preview"}
                    icon="👁"
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => setShowDetail(!showDetail)}
                  />
                  <Action.CopyToClipboard
                    title="Copy Type Name"
                    content={item.type}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action
                    title="Refresh"
                    icon="🔄"
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => setRefreshKey((prev) => prev + 1)}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
