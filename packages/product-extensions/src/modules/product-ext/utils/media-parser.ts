import { MedusaError } from "@medusajs/framework/utils"
import type {
  ImageAltMetadata,
  Model3DItem,
  ProductAttachmentItem,
  UnifiedMediaEntry,
  VariantImageItem,
  VideoInput,
  VideoMediaItem,
  VideoProviderType,
} from "../types"
import {
  escapeCsvCell,
  sanitizeFilename,
  validateExternalMediaUrl,
} from "./security"

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{6,20}$/
const VIMEO_ID_REGEX = /^\d{5,15}$/
const SAFE_EMBED_ID_REGEX = /^[a-zA-Z0-9_-]{4,64}$/

function inferVideoMimeType(urlPath: string): string | null {
  const lower = urlPath.toLowerCase()
  if (lower.endsWith(".mp4") || lower.endsWith(".m4v")) {
    return "video/mp4"
  }
  if (lower.endsWith(".webm")) {
    return "video/webm"
  }
  if (lower.endsWith(".ogg") || lower.endsWith(".ogv")) {
    return "video/ogg"
  }
  if (lower.endsWith(".mov")) {
    return "video/quicktime"
  }
  if (lower.endsWith(".m3u8")) {
    return "application/vnd.apple.mpegurl"
  }
  return null
}

export function parseVideoMediaItem(
  input: VideoInput,
  fallbackPosition = 0
): VideoMediaItem {
  const rawObj: Partial<VideoMediaItem> & { url: string } =
    typeof input === "string" ? { url: input } : input

  const validatedUrl = validateExternalMediaUrl(rawObj.url, {
    allowRelative: true,
    fieldName: "video.url",
  })

  let provider: VideoProviderType = rawObj.provider ?? "external"
  let embedId: string | null = rawObj.embed_id ?? null
  let embedUrl: string | null = rawObj.embed_url ?? null
  let posterUrl: string | null = rawObj.poster_url
    ? validateExternalMediaUrl(rawObj.poster_url, {
        allowRelative: true,
        fieldName: "video.poster_url",
      })
    : null
  const captionsUrl: string | null = rawObj.captions_url
    ? validateExternalMediaUrl(rawObj.captions_url, {
        allowRelative: true,
        fieldName: "video.captions_url",
      })
    : null
  let mimeType: string | null = rawObj.mime_type ?? null

  if (validatedUrl.startsWith("/")) {
    provider = "file"
    mimeType = mimeType ?? inferVideoMimeType(validatedUrl)
  } else {
    const parsed = new URL(validatedUrl)
    const host = parsed.hostname.toLowerCase()
    const pathParts = parsed.pathname.split("/").filter(Boolean)

    if (
      host === "youtu.be" ||
      host.endsWith(".youtube.com") ||
      host === "youtube.com" ||
      host === "www.youtube-nocookie.com"
    ) {
      provider = "youtube"
      let candidateId: string | null = null
      if (host === "youtu.be" && pathParts[0]) {
        candidateId = pathParts[0]
      } else if (parsed.searchParams.get("v")) {
        candidateId = parsed.searchParams.get("v")
      } else if (
        (pathParts[0] === "embed" || pathParts[0] === "shorts") &&
        pathParts[1]
      ) {
        candidateId = pathParts[1]
      }
      if (candidateId && YOUTUBE_ID_REGEX.test(candidateId)) {
        embedId = candidateId
        embedUrl = `https://www.youtube-nocookie.com/embed/${candidateId}`
        posterUrl =
          posterUrl ?? `https://i.ytimg.com/vi/${candidateId}/hqdefault.jpg`
      }
    } else if (host === "vimeo.com" || host === "player.vimeo.com") {
      provider = "vimeo"
      const candidateId =
        pathParts[0] === "video" ? pathParts[1] : pathParts[pathParts.length - 1]
      if (candidateId && VIMEO_ID_REGEX.test(candidateId)) {
        embedId = candidateId
        embedUrl = `https://player.vimeo.com/video/${candidateId}`
      }
    } else if (host === "stream.mux.com" || host === "player.mux.com") {
      provider = "mux"
      const rawMuxId = (pathParts[0] ?? "").replace(/\.(m3u8|mp4)$/i, "")
      if (rawMuxId && SAFE_EMBED_ID_REGEX.test(rawMuxId)) {
        embedId = rawMuxId
        embedUrl = `https://player.mux.com/${rawMuxId}`
        posterUrl = posterUrl ?? `https://image.mux.com/${rawMuxId}/thumbnail.jpg`
      }
      mimeType = mimeType ?? inferVideoMimeType(parsed.pathname)
    } else if (host.endsWith("cloudflarestream.com")) {
      provider = "cloudflare_stream"
      const rawCfId = pathParts[0] ?? ""
      if (rawCfId && SAFE_EMBED_ID_REGEX.test(rawCfId)) {
        embedId = rawCfId
        embedUrl = `https://iframe.videodelivery.net/${rawCfId}`
      }
    } else {
      const detectedMime = inferVideoMimeType(parsed.pathname)
      if (detectedMime) {
        provider = rawObj.provider ?? "file"
        mimeType = mimeType ?? detectedMime
      }
    }
  }

  return {
    id: rawObj.id?.trim() || `vid_${fallbackPosition + 1}`,
    url: validatedUrl,
    provider,
    embed_id: embedId,
    embed_url: embedUrl,
    poster_url: posterUrl,
    captions_url: captionsUrl,
    mime_type: mimeType,
    title: rawObj.title ?? null,
    alt: rawObj.alt ?? null,
    duration_seconds:
      typeof rawObj.duration_seconds === "number" &&
      rawObj.duration_seconds >= 0
        ? rawObj.duration_seconds
        : null,
    position:
      typeof rawObj.position === "number" ? rawObj.position : fallbackPosition,
    autoplay: Boolean(rawObj.autoplay ?? false),
    loop: Boolean(rawObj.loop ?? false),
    muted: Boolean(rawObj.muted ?? false),
  }
}

export function normalizeVideoList(
  videos?: VideoInput[] | null,
  explicitMediaItems?: VideoMediaItem[] | null
): {
  videoUrls: string[]
  mediaItems: VideoMediaItem[]
} {
  const sourceList: VideoInput[] =
    explicitMediaItems && explicitMediaItems.length > 0
      ? explicitMediaItems
      : Array.isArray(videos)
        ? videos
        : []

  const mediaItems = sourceList.map((entry, idx) =>
    parseVideoMediaItem(entry, idx)
  )
  const videoUrls =
    Array.isArray(videos) && videos.length > 0
      ? videos.map((v, idx) =>
          typeof v === "string"
            ? validateExternalMediaUrl(v, {
                allowRelative: true,
                fieldName: `videos[${idx}]`,
              })
            : parseVideoMediaItem(v, idx).url
        )
      : mediaItems.map((m) => m.url)

  return { videoUrls, mediaItems }
}

export function normalizeVariantImages(
  images?: Array<string | VariantImageItem> | null
): VariantImageItem[] {
  if (!Array.isArray(images)) {
    return []
  }
  return images.map((item, idx) => {
    const raw: VariantImageItem =
      typeof item === "string" ? { url: item } : item
    const validUrl = validateExternalMediaUrl(raw.url, {
      allowRelative: true,
      fieldName: `images[${idx}].url`,
    })
    return {
      id: raw.id || `var_img_${idx + 1}`,
      url: validUrl,
      alt: raw.alt ?? null,
      position: typeof raw.position === "number" ? raw.position : idx,
    }
  })
}

export function normalizeModel3DList(
  models?: Model3DItem[] | null
): Model3DItem[] {
  if (!Array.isArray(models)) {
    return []
  }
  return models.map((item, idx) => {
    const glbUrl = validateExternalMediaUrl(item.glb_url, {
      allowRelative: true,
      fieldName: `models_3d[${idx}].glb_url`,
    })
    const usdzUrl = item.usdz_url
      ? validateExternalMediaUrl(item.usdz_url, {
          allowRelative: true,
          fieldName: `models_3d[${idx}].usdz_url`,
        })
      : null
    const posterUrl = item.poster_url
      ? validateExternalMediaUrl(item.poster_url, {
          allowRelative: true,
          fieldName: `models_3d[${idx}].poster_url`,
        })
      : null
    return {
      id: item.id?.trim() || `model3d_${idx + 1}`,
      glb_url: glbUrl,
      usdz_url: usdzUrl,
      poster_url: posterUrl,
      title: item.title ?? null,
      alt: item.alt ?? null,
      position: typeof item.position === "number" ? item.position : idx,
      ar_scale: item.ar_scale === "fixed" ? "fixed" : "auto",
    }
  })
}

export function normalizeAttachmentsList(
  attachments?: ProductAttachmentItem[] | null
): ProductAttachmentItem[] {
  if (!Array.isArray(attachments)) {
    return []
  }
  return attachments.map((item, idx) => {
    const url = validateExternalMediaUrl(item.url, {
      allowRelative: true,
      fieldName: `attachments[${idx}].url`,
    })
    const filename = sanitizeFilename(item.filename || `attachment_${idx + 1}`)
    const label = String(item.label ?? filename).trim() || filename
    return {
      id: item.id?.trim() || `att_${idx + 1}`,
      url,
      filename,
      label,
      category: item.category ?? "other",
      mime_type: item.mime_type ?? null,
      size_bytes:
        typeof item.size_bytes === "number" && item.size_bytes >= 0
          ? item.size_bytes
          : null,
      locale: item.locale ?? null,
      position: typeof item.position === "number" ? item.position : idx,
    }
  })
}

export function buildUnifiedProductMedia(params: {
  coreImages?: Array<{ id?: string; url: string; rank?: number }>
  imageAlts?: ImageAltMetadata[]
  mediaItems?: VideoMediaItem[]
  models3d?: Model3DItem[]
  locale?: string | null
}): UnifiedMediaEntry[] {
  const altByUrl = new Map<string, ImageAltMetadata>()
  const altById = new Map<string, ImageAltMetadata>()

  for (const altItem of params.imageAlts ?? []) {
    if (
      params.locale &&
      altItem.locale &&
      altItem.locale.toLowerCase() !== params.locale.toLowerCase()
    ) {
      continue
    }
    altByUrl.set(altItem.image_url, altItem)
    if (altItem.image_id) {
      altById.set(altItem.image_id, altItem)
    }
  }

  const unified: UnifiedMediaEntry[] = []

  const coreImages = params.coreImages ?? []
  for (let i = 0; i < coreImages.length; i++) {
    const img = coreImages[i]
    const matchedAlt =
      (img.id ? altById.get(img.id) : undefined) ?? altByUrl.get(img.url)
    unified.push({
      id: img.id ?? `img_${i + 1}`,
      kind: "image",
      url: img.url,
      thumbnail_url: img.url,
      alt: matchedAlt?.alt ?? null,
      title: matchedAlt?.title ?? null,
      position: typeof img.rank === "number" ? img.rank * 10 : i * 10,
    })
  }

  if (coreImages.length === 0 && (params.imageAlts ?? []).length > 0) {
    const alts = params.imageAlts ?? []
    for (let i = 0; i < alts.length; i++) {
      const altItem = alts[i]
      unified.push({
        id: altItem.image_id ?? `img_alt_${i + 1}`,
        kind: "image",
        url: altItem.image_url,
        thumbnail_url: altItem.image_url,
        alt: altItem.alt,
        title: altItem.title ?? null,
        position: i * 10,
      })
    }
  }

  for (let i = 0; i < (params.mediaItems ?? []).length; i++) {
    const vid = (params.mediaItems ?? [])[i]
    unified.push({
      id: vid.id || `vid_${i + 1}`,
      kind: "video",
      url: vid.url,
      thumbnail_url: vid.poster_url ?? null,
      alt: vid.alt ?? vid.title ?? null,
      title: vid.title ?? null,
      position:
        typeof vid.position === "number" ? vid.position : (i + 1) * 10 + 1,
      provider: vid.provider,
      embed_url: vid.embed_url ?? null,
      captions_url: vid.captions_url ?? null,
      mime_type: vid.mime_type ?? null,
    })
  }

  for (let i = 0; i < (params.models3d ?? []).length; i++) {
    const m3d = (params.models3d ?? [])[i]
    unified.push({
      id: m3d.id || `model3d_${i + 1}`,
      kind: "model_3d",
      url: m3d.glb_url,
      thumbnail_url: m3d.poster_url ?? null,
      alt: m3d.alt ?? m3d.title ?? null,
      title: m3d.title ?? null,
      position:
        typeof m3d.position === "number" ? m3d.position : (i + 1) * 10 + 2,
      usdz_url: m3d.usdz_url ?? null,
    })
  }

  return unified.sort((a, b) => a.position - b.position)
}

export interface CsvImageAltRow {
  product_id: string
  image_url: string
  image_id?: string | null
  alt: string
  title?: string | null
  caption?: string | null
  locale?: string | null
}

export function exportImageAltsToCsv(rows: CsvImageAltRow[]): string {
  const header = [
    "product_id",
    "image_url",
    "image_id",
    "alt",
    "title",
    "caption",
    "locale",
  ].join(",")

  const lines = rows.map((row) =>
    [
      escapeCsvCell(row.product_id),
      escapeCsvCell(row.image_url),
      escapeCsvCell(row.image_id ?? ""),
      escapeCsvCell(row.alt),
      escapeCsvCell(row.title ?? ""),
      escapeCsvCell(row.caption ?? ""),
      escapeCsvCell(row.locale ?? ""),
    ].join(",")
  )

  return [header, ...lines].join("\n")
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ",") {
      cells.push(current)
      current = ""
    } else {
      current += ch
    }
  }
  cells.push(current)
  return cells
}

export function parseImageAltsFromCsv(csvContent: string): CsvImageAltRow[] {
  const rawLines = String(csvContent ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (rawLines.length < 2) {
    return []
  }

  const headers = parseCsvLine(rawLines[0]).map((h) => h.trim().toLowerCase())
  const productIdIdx = headers.indexOf("product_id")
  const imageUrlIdx = headers.indexOf("image_url")
  const imageIdIdx = headers.indexOf("image_id")
  const altIdx = headers.indexOf("alt")
  const titleIdx = headers.indexOf("title")
  const captionIdx = headers.indexOf("caption")
  const localeIdx = headers.indexOf("locale")

  if (productIdIdx < 0 || imageUrlIdx < 0 || altIdx < 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "CSV header must include at least product_id, image_url, and alt columns"
    )
  }

  const parsedRows: CsvImageAltRow[] = []
  for (let lineIdx = 1; lineIdx < rawLines.length; lineIdx++) {
    const cols = parseCsvLine(rawLines[lineIdx])
    const product_id = (cols[productIdIdx] ?? "").trim()
    const rawUrl = (cols[imageUrlIdx] ?? "").trim()
    const alt = (cols[altIdx] ?? "").trim()

    if (!product_id || !rawUrl) {
      continue
    }

    const image_url = validateExternalMediaUrl(rawUrl, {
      allowRelative: true,
      fieldName: `csv[${lineIdx}].image_url`,
    })

    parsedRows.push({
      product_id,
      image_url,
      image_id: imageIdIdx >= 0 ? cols[imageIdIdx]?.trim() || null : null,
      alt,
      title: titleIdx >= 0 ? cols[titleIdx]?.trim() || null : null,
      caption: captionIdx >= 0 ? cols[captionIdx]?.trim() || null : null,
      locale: localeIdx >= 0 ? cols[localeIdx]?.trim() || null : null,
    })
  }

  return parsedRows
}
