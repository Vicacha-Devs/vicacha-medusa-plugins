import { useCallback, useEffect, useState } from "react"
import { dianClient } from "../sdk"

export function useDianConfig() {
  const [config, setConfig] = useState<Record<string, any> | null>(null)
  const [municipalities, setMunicipalities] = useState<
    Array<Record<string, any>>
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await dianClient.getConfig()
      setConfig(res.config)
      setMunicipalities(res.dane_municipalities || [])
    } catch (err: any) {
      setError(err?.message || "Failed to load DIAN config")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { config, municipalities, loading, error, refresh }
}

export function useDianDocuments(filters?: {
  order_id?: string
  document_type?: string
  status?: string
}) {
  const [documents, setDocuments] = useState<Array<Record<string, any>>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await dianClient.listDocuments(filters)
      setDocuments(res.documents || [])
    } catch (err: any) {
      setError(err?.message || "Failed to load DIAN documents")
    } finally {
      setLoading(false)
    }
  }, [filters?.order_id, filters?.document_type, filters?.status])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { documents, loading, error, refresh }
}

export function useDianResolutions() {
  const [resolutions, setResolutions] = useState<Array<Record<string, any>>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await dianClient.listResolutions()
      setResolutions(res.resolutions || [])
    } catch (err: any) {
      setError(err?.message || "Failed to load DIAN resolutions")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { resolutions, loading, error, refresh }
}
