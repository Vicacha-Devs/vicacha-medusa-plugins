import React, { useState } from "react"

import {
  useCameraBarcodeScanner,
  useHidBarcodeScanner,
  useStoreBarcodeResolver,
} from "../hooks"
import type { BarcodeSymbology } from "../modules/barcode/types"
import { createBarcodeSdk, type BarcodeSdkOptions } from "../sdk"

export function svgMarkupToDataUri(svgMarkup: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgMarkup)}`
}

export interface BarcodeImageProps {
  code: string
  symbology?: BarcodeSymbology
  svgMarkup?: string | null
  baseUrl?: string
  alt?: string
  width?: number
  height?: number
  className?: string
}

/**
 * Renders a 1D/2D barcode or QR SVG safely via `<img>` without dangerouslySetInnerHTML.
 */
export function BarcodeImage({
  code,
  symbology = "ean13",
  svgMarkup,
  baseUrl = "",
  alt,
  width = 220,
  height = 88,
  className,
}: BarcodeImageProps) {
  const sdk = createBarcodeSdk({ baseUrl })
  const src = svgMarkup
    ? svgMarkupToDataUri(svgMarkup)
    : sdk.store.getSvgUrl(code, symbology)

  return (
    <img
      src={src}
      alt={alt || `${symbology.toUpperCase()} ${code}`}
      width={width}
      height={height}
      className={className}
      style={{
        display: "block",
        maxWidth: "100%",
        height: "auto",
        background: "#ffffff",
        borderRadius: 6,
        padding: 4,
      }}
    />
  )
}

export interface AuthenticityVerifierBadgeProps {
  code: string
  signature: string
  sdkOptions?: BarcodeSdkOptions
}

/**
 * Storefront Anti-Counterfeit HMAC-SHA256 Verification Badge.
 */
export function AuthenticityVerifierBadge({
  code,
  signature,
  sdkOptions,
}: AuthenticityVerifierBadgeProps) {
  const { loading, verificationResult, verifyAuthenticity } =
    useStoreBarcodeResolver(sdkOptions)

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: 14,
        background: "#f9fafb",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>
            Product Authenticity Verification
          </div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            Code: <code>{code}</code>
          </div>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => void verifyAuthenticity(code, signature)}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid #111827",
            background: "#111827",
            color: "#ffffff",
            fontSize: 12,
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Verifying..." : "Verify HMAC Seal"}
        </button>
      </div>

      {verificationResult ? (
        <div
          style={{
            padding: "8px 10px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            background: verificationResult.valid ? "#ecfdf5" : "#fef2f2",
            color: verificationResult.valid ? "#065f46" : "#991b1b",
            border: `1px solid ${
              verificationResult.valid ? "#a7f3d0" : "#fecaca"
            }`,
          }}
        >
          {verificationResult.valid
            ? `Authentic Verified: ${verificationResult.reason}`
            : `Verification Failed: ${verificationResult.reason}`}
        </div>
      ) : null}
    </div>
  )
}

export interface StorefrontBarcodeScannerProps {
  sdkOptions?: BarcodeSdkOptions
  enableHidScanner?: boolean
  onResolved?: (result: Record<string, unknown>) => void
}

/**
 * Interactive Storefront Camera & USB HID Barcode/QR Scanner widget.
 */
export function StorefrontBarcodeScanner({
  sdkOptions,
  enableHidScanner = true,
  onResolved,
}: StorefrontBarcodeScannerProps) {
  const [manualCode, setManualCode] = useState("")
  const { loading, error, scanResult, resolveScan } =
    useStoreBarcodeResolver(sdkOptions)

  const handleDetected = async (barcode: string) => {
    setManualCode(barcode)
    const res = await resolveScan(barcode)
    if (res && onResolved) {
      onResolved(res)
    }
  }

  useHidBarcodeScanner({
    enabled: enableHidScanner,
    onScan: (barcode) => {
      void handleDetected(barcode)
    },
  })

  const { videoRef, isScanning, cameraError, startCamera, stopCamera } =
    useCameraBarcodeScanner({
      onScan: (barcode) => {
        void handleDetected(barcode)
      },
    })

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 16,
        background: "#ffffff",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>
          Scan Product Barcode or QR
        </span>
        <button
          type="button"
          onClick={() => (isScanning ? stopCamera() : void startCamera())}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid #d1d5db",
            background: isScanning ? "#fee2e2" : "#f3f4f6",
            color: isScanning ? "#991b1b" : "#111827",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {isScanning ? "Stop Camera" : "Use Camera Scanner"}
        </button>
      </div>

      {isScanning ? (
        <video
          ref={videoRef}
          muted
          playsInline
          style={{
            width: "100%",
            maxHeight: 220,
            borderRadius: 8,
            background: "#000000",
            objectFit: "cover",
          }}
        />
      ) : null}

      {cameraError ? (
        <div style={{ fontSize: 12, color: "#b91c1c" }}>{cameraError}</div>
      ) : null}

      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder="Scan or enter EAN-13, UPC, ISBN, or QR code..."
          style={{
            flex: 1,
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid #d1d5db",
            fontSize: 13,
          }}
        />
        <button
          type="button"
          disabled={loading || !manualCode.trim()}
          onClick={() => void handleDetected(manualCode.trim())}
          style={{
            padding: "8px 14px",
            borderRadius: 6,
            border: "1px solid #111827",
            background: "#111827",
            color: "#ffffff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {loading ? "Looking up..." : "Lookup"}
        </button>
      </div>

      {error ? (
        <div style={{ fontSize: 12, color: "#b91c1c" }}>{error}</div>
      ) : null}

      {scanResult ? (
        <div
          style={{
            padding: 10,
            borderRadius: 8,
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            fontSize: 12,
          }}
        >
          <div>
            <strong>Code:</strong> {String(scanResult.code || "")}
          </div>
          <div>
            <strong>Action:</strong> {String(scanResult.action || "view")}
          </div>
          {scanResult.target_url ? (
            <div>
              <strong>Target URL:</strong> {String(scanResult.target_url)}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
