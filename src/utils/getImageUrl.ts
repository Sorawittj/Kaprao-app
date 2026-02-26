export function getValidImageUrl(url: string | undefined | null): string {
    const base = import.meta.env.BASE_URL || '/';
    const fallbackImage = `${base}images/logo.png`;

    if (!url) return fallbackImage;
    if (url.startsWith('http')) return url;

    let cleanUrl = url;
    if (cleanUrl.startsWith('/')) cleanUrl = cleanUrl.slice(1);

    if (cleanUrl.startsWith('images/')) {
        return `${base}${cleanUrl}`;
    }

    return `${base}images/${cleanUrl}`;
}
