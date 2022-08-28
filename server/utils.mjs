
export function getRelativePath(path, localhost = false) {
    if (localhost) {
        return `http://localhost:3080${path}`

    } else {
        return `https://inck.io${path}`
    }
}