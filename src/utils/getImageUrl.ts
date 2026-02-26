export function getValidImageUrl(url: string | undefined | null): string {
    const base = import.meta.env.BASE_URL;
    if (!url) return `${base}images/logo.png`
    if (url.startsWith('http')) return url
    if (url.startsWith('/')) return `${base}${url.slice(1)}`
    return `${base}images/${url}`
}
