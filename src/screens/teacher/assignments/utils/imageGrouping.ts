// Pure grouping logic for Bulk Upload Images — extracted from useBulkUpload
// so it's testable without the file-picker DOM APIs (document.createElement
// ('input'), FileReader) the rest of that hook depends on.

export type PickedImage = { id: string; name: string; base64: string; mime: string };
export type ImageGroup = { id: string; imageIds: string[] };

export function groupedImageIdSet(imageGroups: ImageGroup[]): Set<string> {
  return new Set(imageGroups.flatMap(g => g.imageIds));
}

// Resolves the final set of worksheets from the picked images + confirmed
// groups: each group becomes one multi-page worksheet (in the order images
// were added to it), and any image not in a group becomes its own
// single-page worksheet — preserving the original single-image upload
// behavior for anything the teacher didn't explicitly combine.
export function resolveImageGroups(
  pendingImages: PickedImage[],
  imageGroups: ImageGroup[],
): { groups: PickedImage[][]; ungrouped: PickedImage[] } {
  const byId = new Map(pendingImages.map(img => [img.id, img]));
  const grouped = groupedImageIdSet(imageGroups);

  const groups = imageGroups.map(g =>
    g.imageIds.map(id => byId.get(id)).filter((img): img is PickedImage => Boolean(img))
  );
  const ungrouped = pendingImages.filter(img => !grouped.has(img.id));

  return { groups, ungrouped };
}
