/** True when the person asked the system to reduce motion. */
/** Jumps to the top of the page at once (the page style would otherwise scroll smoothly). */
export const scrollToTop = (): void => window.scrollTo({ top: 0, behavior: 'instant' })

export const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
