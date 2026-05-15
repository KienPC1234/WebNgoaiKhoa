/**
 * Shared reCAPTCHA helper used by Login, Register, and VerifyEmail pages.
 *
 * Returns a reCAPTCHA v3 token when the site key is configured and the
 * invisible widget is mounted, or `null` when reCAPTCHA is unavailable /
 * timed out.  This keeps captcha logic in one place so every auth page
 * behaves identically.
 */

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || ''

export { RECAPTCHA_SITE_KEY }

/**
 * Safely execute an invisible reCAPTCHA and return the token.
 *
 * @param {React.RefObject} recaptchaRef – ref to a mounted `<ReCAPTCHA>` widget
 * @returns {Promise<string|null>} the token, or null on timeout / error
 */
export const getRecaptchaTokenSafely = async (recaptchaRef) => {
  if (!RECAPTCHA_SITE_KEY || !recaptchaRef?.current) return null

  try {
    const token = await Promise.race([
      recaptchaRef.current.executeAsync(),
      new Promise((resolve) => setTimeout(() => resolve(null), 8000)),
    ])
    recaptchaRef.current.reset()
    return token || null
  } catch {
    return null
  }
}
