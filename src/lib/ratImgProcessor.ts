import { readdir } from "node:fs/promises";

const dirfiles = await readdir("./ratimages", { withFileTypes: true })

export const ratImgFiles = dirfiles.length

export function getImgPath(n: number) {
    if (n > ratImgFiles - 1) {
        n = 0
    }

    return dirfiles[n].parentPath + "/" + dirfiles[n].name
}