
export function getRelativePath(path) {
    if (process.env.NODE_ENV == "dev") {
        return `http://localhost:3080${path}`

    } else {
        return `https://inck.io${path}`
    }
}