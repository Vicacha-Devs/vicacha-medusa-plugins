import React, { useState } from "react"
import type {
  ProductAttachmentItem,
  ProductFeatureDTO,
  ProductOptionMetadata,
  ResolvedProductAttributeEntry,
  ResolvedSectionNodeV1,
  UnifiedMediaEntry,
  UnitCode,
} from "../modules/product-ext/types"
import { convertUnit, formatUnitDisplay } from "../modules/product-ext/utils/unit-converter"

export interface ProductMediaGalleryProps {
  items: UnifiedMediaEntry[]
  className?: string
}

export const ProductMediaGallery: React.FC<ProductMediaGalleryProps> = ({
  items,
  className = "",
}) => {
  const [activeIndex, setActiveIndex] = useState(0)

  if (!items || items.length === 0) {
    return null
  }

  const active = items[Math.min(activeIndex, items.length - 1)]

  return (
    <div className={`medusa-product-ext-gallery ${className}`.trim()}>
      <div className="medusa-product-ext-gallery-stage">
        {active.kind === "image" && (
          <img
            src={active.url}
            alt={active.alt || active.title || "Product image"}
            title={active.title || undefined}
            style={{ maxWidth: "100%", height: "auto", borderRadius: "8px" }}
          />
        )}

        {active.kind === "video" &&
          (active.embed_url ? (
            <iframe
              src={active.embed_url}
              title={active.title || active.alt || "Product video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                width: "100%",
                aspectRatio: "16 / 9",
                border: 0,
                borderRadius: "8px",
              }}
            />
          ) : (
            <video
              controls
              poster={active.thumbnail_url || undefined}
              style={{ width: "100%", borderRadius: "8px" }}
            >
              <source
                src={active.url}
                type={active.mime_type || "video/mp4"}
              />
              {active.captions_url && (
                <track
                  kind="captions"
                  src={active.captions_url}
                  srcLang="en"
                  label="Captions"
                />
              )}
            </video>
          ))}

        {active.kind === "model_3d" && (
          <div
            style={{
              padding: "20px",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <p style={{ fontWeight: 600, marginBottom: "8px" }}>
              {active.title || active.alt || "Interactive 3D / AR Model"}
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <a
                href={active.url}
                rel="noopener noreferrer"
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  backgroundColor: "#111827",
                  color: "#ffffff",
                  textDecoration: "none",
                  fontSize: "13px",
                }}
              >
                View 3D (.GLB)
              </a>
              {active.usdz_url && (
                <a
                  href={active.usdz_url}
                  rel="ar noopener noreferrer"
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid #111827",
                    color: "#111827",
                    textDecoration: "none",
                    fontSize: "13px",
                  }}
                >
                  Open in iOS AR (.USDZ)
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {items.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "12px",
            flexWrap: "wrap",
          }}
        >
          {items.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                border:
                  idx === activeIndex
                    ? "2px solid #111827"
                    : "1px solid #d1d5db",
                background: idx === activeIndex ? "#f3f4f6" : "#ffffff",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              {item.kind === "video"
                ? `Video ${idx + 1}`
                : item.kind === "model_3d"
                  ? `3D ${idx + 1}`
                  : item.title || `Image ${idx + 1}`}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export interface VariantOptionSwatchPickerProps {
  optionMetadata: ProductOptionMetadata[]
  selectedOptions: Record<string, string>
  onSelectOption: (optionTitle: string, value: string) => void
}

export const VariantOptionSwatchPicker: React.FC<
  VariantOptionSwatchPickerProps
> = ({ optionMetadata, selectedOptions, onSelectOption }) => {
  if (!optionMetadata || optionMetadata.length === 0) {
    return null
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {optionMetadata.map((opt) => {
        const selectedVal = selectedOptions[opt.option_title]
        return (
          <div key={opt.option_title}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "6px",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: "14px" }}>
                {opt.option_title}
                {selectedVal ? `: ${selectedVal}` : ""}
              </span>
              {opt.size_chart_url && (
                <a
                  href={opt.size_chart_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "12px", textDecoration: "underline" }}
                >
                  Size Guide
                </a>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {(opt.values ?? []).map((val) => {
                const isSelected = selectedVal === val.value
                return (
                  <button
                    key={val.value}
                    type="button"
                    onClick={() => onSelectOption(opt.option_title, val.value)}
                    title={val.description || val.value}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      borderRadius: "9999px",
                      border: isSelected
                        ? "2px solid #111827"
                        : "1px solid #d1d5db",
                      background: "#ffffff",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    {val.hex_color && (
                      <span
                        style={{
                          width: "14px",
                          height: "14px",
                          borderRadius: "50%",
                          backgroundColor: val.hex_color,
                          border: "1px solid rgba(0,0,0,0.15)",
                          display: "inline-block",
                        }}
                      />
                    )}
                    <span>{val.value}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export interface ProductFeatureBadgesProps {
  features: ProductFeatureDTO[]
}

export const ProductFeatureBadges: React.FC<ProductFeatureBadgesProps> = ({
  features,
}) => {
  if (!features || features.length === 0) {
    return null
  }

  return (
    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
      {features.map((feat) => (
        <div
          key={feat.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            backgroundColor: "#f9fafb",
          }}
        >
          {feat.icon_url && (
            <img
              src={feat.icon_url}
              alt={feat.title}
              style={{ width: "20px", height: "20px", objectFit: "contain" }}
            />
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: "13px" }}>
              {feat.title}
            </div>
            {feat.subtitle && (
              <div style={{ fontSize: "11px", color: "#6b7280" }}>
                {feat.subtitle}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export interface ProductSpecsTableProps {
  attributes: ResolvedProductAttributeEntry[]
  preferredUnitOverrides?: Partial<Record<string, UnitCode>>
}

export const ProductSpecsTable: React.FC<ProductSpecsTableProps> = ({
  attributes,
  preferredUnitOverrides,
}) => {
  if (!attributes || attributes.length === 0) {
    return null
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <tbody>
        {attributes.map(({ definition, value, display_value }) => {
          let renderedValue = display_value
          const targetUnit = preferredUnitOverrides?.[definition.key]
          if (
            definition.type === "unit" &&
            targetUnit &&
            value.unit &&
            value.value_number !== null &&
            value.value_number !== undefined &&
            targetUnit !== value.unit
          ) {
            try {
              const converted = convertUnit(
                value.value_number,
                value.unit,
                targetUnit
              )
              renderedValue = formatUnitDisplay(converted, targetUnit)
            } catch {
              renderedValue = display_value
            }
          }

          return (
            <tr
              key={value.id}
              style={{ borderBottom: "1px solid #e5e7eb" }}
            >
              <th
                style={{
                  textAlign: "left",
                  padding: "8px 12px",
                  fontWeight: 600,
                  fontSize: "13px",
                  color: "#374151",
                  width: "40%",
                }}
              >
                {definition.label}
              </th>
              <td
                style={{
                  padding: "8px 12px",
                  fontSize: "13px",
                  color: "#111827",
                }}
              >
                {definition.type === "color" && value.value_text ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        backgroundColor: value.value_text,
                        border: "1px solid rgba(0,0,0,0.15)",
                        display: "inline-block",
                      }}
                    />
                    {value.value_text}
                  </span>
                ) : definition.type === "file" && value.value_text ? (
                  <a
                    href={value.value_text}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download specification
                  </a>
                ) : (
                  renderedValue
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export interface HierarchicalInfoAccordionProps {
  sections: ResolvedSectionNodeV1[]
}

export const HierarchicalInfoAccordion: React.FC<
  HierarchicalInfoAccordionProps
> = ({ sections }) => {
  const [openSectionIds, setOpenSectionIds] = useState<Record<string, boolean>>(
    () =>
      sections?.[0]
        ? {
            [sections[0].id]: true,
          }
        : {}
  )

  if (!sections || sections.length === 0) {
    return null
  }

  const toggleSection = (id: string) => {
    setOpenSectionIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {sections.map((section) => {
        const isOpen = Boolean(openSectionIds[section.id])
        return (
          <div
            key={section.id}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                background: "#f9fafb",
                border: 0,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "14px",
              }}
            >
              <span>{section.title}</span>
              <span>{isOpen ? "−" : "+"}</span>
            </button>

            {isOpen && (
              <div style={{ padding: "12px 16px" }}>
                {section.items.map((item) => (
                  <div key={item.id} style={{ marginBottom: "12px" }}>
                    <h4
                      style={{
                        margin: "0 0 6px 0",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      {item.title}
                    </h4>
                    {item.blocks.map((block, bIdx) => {
                      if (block.type === "markdown") {
                        return (
                          <p
                            key={bIdx}
                            style={{
                              margin: "0 0 6px 0",
                              fontSize: "13px",
                              lineHeight: 1.5,
                              whiteSpace: "pre-line",
                            }}
                          >
                            {block.text}
                          </p>
                        )
                      }
                      if (block.type === "list") {
                        const ListTag =
                          block.style === "ordered" ? "ol" : "ul"
                        return (
                          <ListTag
                            key={bIdx}
                            style={{
                              margin: "0 0 6px 18px",
                              fontSize: "13px",
                            }}
                          >
                            {block.items.map((li, liIdx) => (
                              <li key={liIdx}>{li}</li>
                            ))}
                          </ListTag>
                        )
                      }
                      return (
                        <dl
                          key={bIdx}
                          style={{
                            margin: "0 0 6px 0",
                            fontSize: "13px",
                          }}
                        >
                          {block.pairs.map((pair, pIdx) => (
                            <div
                              key={pIdx}
                              style={{
                                display: "flex",
                                gap: "8px",
                                padding: "2px 0",
                              }}
                            >
                              <dt style={{ fontWeight: 600 }}>
                                {pair.label}:
                              </dt>
                              <dd style={{ margin: 0 }}>{pair.value}</dd>
                            </div>
                          ))}
                        </dl>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export interface ProductAttachmentsListProps {
  attachments: ProductAttachmentItem[]
}

export const ProductAttachmentsList: React.FC<ProductAttachmentsListProps> = ({
  attachments,
}) => {
  if (!attachments || attachments.length === 0) {
    return null
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {attachments.map((att) => (
        <li
          key={att.id}
          style={{
            padding: "8px 0",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>
            <strong>{att.label}</strong>{" "}
            <small style={{ color: "#6b7280" }}>({att.filename})</small>
          </span>
          <a
            href={att.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "13px", textDecoration: "underline" }}
          >
            Download
          </a>
        </li>
      ))}
    </ul>
  )
}
