import { deflateRawSync } from "zlib"
import type { ZipFileEntry } from "../../../types"
import { sanitizeFilename } from "./formatters"

export type { ZipFileEntry } from "../../../types"

// Precompute CRC32 lookup table
const CRC32_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  CRC32_TABLE[i] = c >>> 0
}

export function crc32(buf: Buffer): number {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = CRC32_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function toDosDateTime(date: Date): { dosTime: number; dosDate: number } {
  const year = Math.max(1980, date.getUTCFullYear())
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()
  const hours = date.getUTCHours()
  const minutes = date.getUTCMinutes()
  const seconds = Math.floor(date.getUTCSeconds() / 2)

  const dosTime = ((hours & 0x1f) << 11) | ((minutes & 0x3f) << 5) | (seconds & 0x1f)
  const dosDate =
    (((year - 1980) & 0x7f) << 9) | ((month & 0x0f) << 5) | (day & 0x1f)

  return { dosTime, dosDate }
}

/**
 * Builds a standard PKZIP archive Buffer in memory using Node's built-in `zlib.deflateRawSync`.
 * Zero third-party dependencies required.
 */
export function createZipArchive(entries: ZipFileEntry[]): Buffer {
  const localFileChunks: Buffer[] = []
  const centralDirectoryChunks: Buffer[] = []
  let offset = 0

  const usedNames = new Set<string>()

  for (const entry of entries) {
    let safeName = sanitizeFilename(entry.filename, "document.pdf")
    if (usedNames.has(safeName)) {
      const dotIdx = safeName.lastIndexOf(".")
      const base = dotIdx > 0 ? safeName.slice(0, dotIdx) : safeName
      const ext = dotIdx > 0 ? safeName.slice(dotIdx) : ""
      let counter = 2
      while (usedNames.has(`${base}-${counter}${ext}`)) {
        counter++
      }
      safeName = `${base}-${counter}${ext}`
    }
    usedNames.add(safeName)

    const nameBuf = Buffer.from(safeName, "utf8")
    const uncompressed = entry.content
    const compressed = deflateRawSync(uncompressed)
    const fileCrc = crc32(uncompressed)
    const { dosTime, dosDate } = toDosDateTime(entry.modifiedAt ?? new Date())

    // Local File Header (30 bytes + filename)
    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0) // signature
    localHeader.writeUInt16LE(20, 4) // version needed to extract (2.0)
    localHeader.writeUInt16LE(0x0800, 6) // UTF-8 filename flag
    localHeader.writeUInt16LE(8, 8) // compression method: deflate (8)
    localHeader.writeUInt16LE(dosTime, 10)
    localHeader.writeUInt16LE(dosDate, 12)
    localHeader.writeUInt32LE(fileCrc, 14)
    localHeader.writeUInt32LE(compressed.length, 18)
    localHeader.writeUInt32LE(uncompressed.length, 22)
    localHeader.writeUInt16LE(nameBuf.length, 26)
    localHeader.writeUInt16LE(0, 28) // extra field length

    localFileChunks.push(localHeader, nameBuf, compressed)

    // Central Directory File Header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0) // signature
    centralHeader.writeUInt16LE(20, 4) // version made by
    centralHeader.writeUInt16LE(20, 6) // version needed
    centralHeader.writeUInt16LE(0x0800, 8) // UTF-8 flag
    centralHeader.writeUInt16LE(8, 10) // compression method: deflate
    centralHeader.writeUInt16LE(dosTime, 12)
    centralHeader.writeUInt16LE(dosDate, 14)
    centralHeader.writeUInt32LE(fileCrc, 16)
    centralHeader.writeUInt32LE(compressed.length, 20)
    centralHeader.writeUInt32LE(uncompressed.length, 24)
    centralHeader.writeUInt16LE(nameBuf.length, 28)
    centralHeader.writeUInt16LE(0, 30) // extra field length
    centralHeader.writeUInt16LE(0, 32) // file comment length
    centralHeader.writeUInt16LE(0, 34) // disk number start
    centralHeader.writeUInt16LE(0, 36) // internal file attributes
    centralHeader.writeUInt32LE(0, 38) // external file attributes
    centralHeader.writeUInt32LE(offset, 42) // relative offset of local header

    centralDirectoryChunks.push(centralHeader, nameBuf)

    offset += localHeader.length + nameBuf.length + compressed.length
  }

  const centralDirectoryBuffer = Buffer.concat(centralDirectoryChunks)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0) // End of central directory signature
  eocd.writeUInt16LE(0, 4) // number of this disk
  eocd.writeUInt16LE(0, 6) // disk where central directory starts
  eocd.writeUInt16LE(entries.length, 8) // total entries on this disk
  eocd.writeUInt16LE(entries.length, 10) // total entries
  eocd.writeUInt32LE(centralDirectoryBuffer.length, 12) // size of central directory
  eocd.writeUInt32LE(offset, 16) // offset of start of central directory
  eocd.writeUInt16LE(0, 20) // comment length

  return Buffer.concat([...localFileChunks, centralDirectoryBuffer, eocd])
}
