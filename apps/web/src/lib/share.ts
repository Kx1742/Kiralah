export function whatsAppUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** The phone's share sheet if it has one, otherwise WhatsApp's own link. */
export async function shareToWhatsApp(text: string): Promise<void> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ text });
      return;
    } catch (error) {
      // Closing the share sheet is not a failure, so don't open anything else.
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }
  window.location.href = whatsAppUrl(text);
}
