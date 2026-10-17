import { basename } from "node:path"
import { deflateRawSync } from "node:zlib"

export interface ZipEntryInput {
  filename: string
  content: Buffer | string
}

/**
 * Sanitizes a filename to prevent directory traversal (Zip Slip) and enforces
 * a strict alphanumeric + `.` `_` `-` allow-list.
 */
export function sanitizeArchiveFilename(rawName: string): string {
  const base = basename(String(rawName || "document.xml"))
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_")
  return cleaned || "document.xml"
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  return table
})()

function computeCrc32(buf: Buffer): number {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = CRC32_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/**
 * Creates a standard PKZIP (`application/zip`) archive Buffer in memory using Node's
 * built-in `node:zlib` (`deflateRawSync`) with zero external dependencies.
 *
 * Used for:
 * 1. `z{NIT}{Consecutive}.zip` sent to DIAN SOAP `SendBillSync` / `SendTestSetAsync`
 * 2. Official DIAN `ad{NIT}{Consecutive}.zip` (`AttachedDocument` XML + PDF Representación Gráfica)
 */
export function createDianZipArchive(entries: ZipEntryInput[]): Buffer {
  const localFileChunks: Buffer[] = []
  const centralDirChunks: Buffer[] = []
  let currentOffset = 0

  for (const entry of entries) {
    const safeName = sanitizeArchiveFilename(entry.filename)
    const nameBuf = Buffer.from(safeName, "utf8")
    const rawData = Buffer.isBuffer(entry.content)
      ? entry.content
      : Buffer.from(entry.content, "utf8")

    const crc = computeCrc32(rawData)
    const compressed = deflateRawSync(rawData)

    // Local file header (30 bytes + filename length)
    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0) // Local file header signature
    localHeader.writeUInt16LE(20, 4) // Version needed to extract (2.0)
    localHeader.writeUInt16LE(0, 6) // General purpose bit flag
    localHeader.writeUInt16LE(8, 8) // Compression method (8 = Deflate)
    localHeader.writeUInt16LE(0, 10) // Last mod file time
    localHeader.writeUInt16LE(0, 12) // Last mod file date
    localHeader.writeUInt32LE(crc, 14) // CRC-32
    localHeader.writeUInt32LE(compressed.length, 18) // Compressed size
    localHeader.writeUInt32LE(rawData.length, 22) // Uncompressed size
    localHeader.writeUInt16LE(nameBuf.length, 26) // File name length
    localHeader.writeUInt16LE(0, 28) // Extra field length

    localFileChunks.push(localHeader, nameBuf, compressed)

    // Central directory file header (46 bytes + filename length)
    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0) // Central file header signature
    centralHeader.writeUInt16LE(20, 4) // Version made by
    centralHeader.writeUInt16LE(20, 6) // Version needed to extract
    centralHeader.writeUInt16LE(0, 8) // General purpose bit flag
    centralHeader.writeUInt16LE(8, 10) // Compression method (Deflate)
    centralHeader.writeUInt16LE(0, 12) // Last mod file time
    centralHeader.writeUInt16LE(0, 14) // Last mod file date
    centralHeader.writeUInt32LE(crc, 16) // CRC-32
    centralHeader.writeUInt32LE(compressed.length, 20) // Compressed size
    centralHeader.writeUInt32LE(rawData.length, 24) // Uncompressed size
    centralHeader.writeUInt16LE(nameBuf.length, 28) // File name length
    centralHeader.writeUInt16LE(0, 30) // Extra field length
    centralHeader.writeUInt16LE(0, 32) // File comment length
    centralHeader.writeUInt16LE(0, 34) // Disk number start
    centralHeader.writeUInt16LE(0, 36) // Internal file attributes
    centralHeader.writeUInt32LE(0, 38) // External file attributes
    centralHeader.writeUInt32LE(currentOffset, 42) // Relative offset of local header

    centralDirChunks.push(centralHeader, nameBuf)
    currentOffset += localHeader.length + nameBuf.length + compressed.length
  }

  const centralDirBuffer = Buffer.concat(centralDirChunks)
  const endOfCentralDir = Buffer.alloc(22)
  endOfCentralDir.writeUInt32LE(0x06054b50, 0) // End of central dir signature
  endOfCentralDir.writeUInt16LE(0, 4) // Number of this disk
  endOfCentralDir.writeUInt16LE(0, 6) // Disk where central directory starts
  endOfCentralDir.writeUInt16LE(entries.length, 8) // Number of central directory records on this disk
  endOfCentralDir.writeUInt16LE(entries.length, 10) // Total number of central directory records
  endOfCentralDir.writeUInt32LE(centralDirBuffer.length, 12) // Size of central directory
  endOfCentralDir.writeUInt32LE(currentOffset, 16) // Offset of start of central directory
  endOfCentralDir.writeUInt16LE(0, 20) // Comment length

  return Buffer.concat([
    ...localFileChunks,
    centralDirBuffer,
    endOfCentralDir,
  ])
}
