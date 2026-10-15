import { useCallback, useEffect, useRef, useState } from "react"

import { createBarcodeSdk, type BarcodeSdkOptions } from "../sdk"

export interface UseHidBarcodeScannerOptions {
  enabled?: boolean
  minLength?: number
  maxInterKeyDelayMs?: number
  onScan: (barcode: string) => void
}

/**
 * Listens for high-speed USB / Bluetooth HID keyboard-wedge barcode scanners.
 * Hardware scanners emit keystrokes at < 35ms intervals followed by Enter.
 */
export function useHidBarcodeScanner({
  enabled = true,
  minLength = 6,
  maxInterKeyDelayMs = 45,
  onScan,
}: UseHidBarcodeScannerOptions) {
  const bufferRef = useRef<string>("")
  const lastKeyTimeRef = useRef<number>(0)
  const [lastScanned, setLastScanned] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const now = Date.now()
      const elapsed = now - lastKeyTimeRef.current

      if (event.key === "Enter" || event.key === "Tab") {
        const candidate = bufferRef.current.trim()
        bufferRef.current = ""
        if (candidate.length >= minLength && elapsed <= maxInterKeyDelayMs * 3) {
          event.preventDefault()
          setLastScanned(candidate)
          onScan(candidate)
        }
        return
      }

      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (elapsed > maxInterKeyDelayMs) {
          bufferRef.current = event.key
        } else {
          bufferRef.current += event.key
        }
        lastKeyTimeRef.current = now
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [enabled, minLength, maxInterKeyDelayMs, onScan])

  return {
    lastScanned,
    clearLastScanned: () => setLastScanned(null),
  }
}

export interface UseCameraBarcodeScannerOptions {
  onScan: (barcode: string) => void
  facingMode?: "environment" | "user"
}

interface NativeBarcodeDetector {
  detect: (
    source: HTMLVideoElement
  ) => Promise<Array<{ rawValue?: string; format?: string }>>
}

/**
 * WebRTC camera barcode & QR scanner hook using native BarcodeDetector when available.
 */
export function useCameraBarcodeScanner({
  onScan,
  facingMode = "environment",
}: UseCameraBarcodeScannerOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop()
      }
      streamRef.current = null
    }
    setIsScanning(false)
  }, [])

  const startCamera = useCallback(async () => {
    setCameraError(null)
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setCameraError("Camera API is not available in this browser")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => undefined)
      }
      setIsScanning(true)

      const DetectorCtor = (
        globalThis as unknown as {
          BarcodeDetector?: new (opts?: {
            formats?: string[]
          }) => NativeBarcodeDetector
        }
      ).BarcodeDetector

      if (DetectorCtor) {
        const detector = new DetectorCtor({
          formats: [
            "ean_13",
            "ean_8",
            "upc_a",
            "upc_e",
            "code_128",
            "code_39",
            "qr_code",
            "data_matrix",
          ],
        })

        const tick = async () => {
          if (!videoRef.current || !streamRef.current) return
          try {
            const results = await detector.detect(videoRef.current)
            const first = results?.[0]?.rawValue
            if (first) {
              onScan(first)
              stopCamera()
              return
            }
          } catch {
            // continue scanning frame
          }
          rafRef.current = requestAnimationFrame(() => {
            void tick()
          })
        }

        rafRef.current = requestAnimationFrame(() => {
          void tick()
        })
      }
    } catch (err) {
      setCameraError(
        err instanceof Error ? err.message : "Unable to access camera"
      )
      setIsScanning(false)
    }
  }, [facingMode, onScan, stopCamera])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  return {
    videoRef,
    isScanning,
    cameraError,
    startCamera,
    stopCamera,
  }
}

/**
 * Storefront hook for resolving scanned barcodes/QR codes and verifying anti-counterfeit HMAC signatures.
 */
export function useStoreBarcodeResolver(sdkOptions?: BarcodeSdkOptions) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<Record<string, unknown> | null>(
    null
  )
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean
    code: string
    reason: string
    tag: Record<string, unknown> | null
  } | null>(null)

  const resolveScan = useCallback(
    async (code: string) => {
      setLoading(true)
      setError(null)
      try {
        const sdk = createBarcodeSdk(sdkOptions)
        const res = await sdk.store.resolveScan(code)
        setScanResult(res)
        return res
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to resolve scan"
        setError(msg)
        return null
      } finally {
        setLoading(false)
      }
    },
    [sdkOptions]
  )

  const verifyAuthenticity = useCallback(
    async (code: string, signature: string) => {
      setLoading(true)
      setError(null)
      try {
        const sdk = createBarcodeSdk(sdkOptions)
        const res = await sdk.store.verifyAuthenticity(code, signature)
        setVerificationResult(res)
        return res
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Authenticity check failed"
        setError(msg)
        return null
      } finally {
        setLoading(false)
      }
    },
    [sdkOptions]
  )

  return {
    loading,
    error,
    scanResult,
    verificationResult,
    resolveScan,
    verifyAuthenticity,
  }
}
