import { FileModel } from "../db/Models.mjs";

/**
 * keep files only now
 *
 *
 */
export async function exploreTree(roots) {
  const children = new Set();

  let toExplore = roots;
  let toExploreNext = [];

  while (toExplore.length > 0) {
    for (let idx = 0; idx < toExplore.length; idx++) {
      const element = toExplore[idx];
      children.add(element._id);

      if (element.type == "folder") {
        const results = await FileModel.find({
          parentDir: element._id,
        });
        toExploreNext = toExploreNext.concat(results);
      }
    }
    toExplore = toExploreNext;
    toExploreNext = [];
  }
  return children;
}
