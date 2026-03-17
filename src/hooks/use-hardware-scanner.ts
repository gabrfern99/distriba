import { useEffect, useRef } from 'react'

/** Max milliseconds between consecutive keystrokes to still be considered scanner input. */
const INTER_CHAR_MS = 50
/** Minimum characters needed to consider a sequence a valid barcode. */
const MIN_BARCODE_LEN = 4

/**
 * Listens for USB/Bluetooth HID barcode scanner input (keyboard-emulation mode).
 *
 * Scanners fire characters much faster than a human (< 50 ms apart) and end
 * with an Enter key. This hook collects those characters globally and calls
 * `onScan` with the assembled code.
 *
 * It intentionally does NOT intercept events when an input/textarea/select
 * is focused — in that case the scanner types directly into the field and
 * the existing onChange/onKeyDown handlers handle it.
 */
export function useHardwareScanner(onScan: (code: string) => void, enabled = true) {
  const onScanRef = useRef(onScan)
  useEffect(() => { onScanRef.current = onScan })

  useEffect(() => {
    if (!enabled) return

    let buffer = ''
    let lastTime = 0
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    function flush() {
      const code = buffer.trim()
      buffer = ''
      lastTime = 0
      if (code.length >= MIN_BARCODE_LEN) {
        onScanRef.current(code)
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      // When an editable element is focused, let the scanner type into it normally.
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) return

      if (e.key === 'Enter') {
        if (timeoutId) { clearTimeout(timeoutId); timeoutId = null }
        flush()
        return
      }

      // Ignore non-printable keys (Shift, Ctrl, arrows, F-keys, etc.)
      if (e.key.length !== 1) return

      const now = Date.now()
      // Gap too large → human typing, reset buffer
      if (lastTime && now - lastTime > INTER_CHAR_MS) {
        buffer = ''
      }

      buffer += e.key
      lastTime = now

      // Auto-flush after short delay (handles scanners without Enter terminator)
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(flush, 100)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [enabled])
}
