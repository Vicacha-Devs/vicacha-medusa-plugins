import { useEffect, useState } from "react"
import { useQueryClient, QueryKey } from "@tanstack/react-query"

import { boldAdminSdk, BoldApiClient } from "../../sdk/client"
import { boldQueryKeys } from "../../sdk/query-keys"
import { BoldPaymentStreamStatus } from "../../types"

export interface UseBoldStatusStreamOptions {
  sessionId?: string | null
  enabled?: boolean
  /**
   * The API client instance to use (e.g. boldAdminSdk or boldStoreSdk)
   * @default boldAdminSdk
   */
  client?: BoldApiClient
  /**
   * Custom TanStack Query key to invalidate upon successful payment capture
   * @default ["orders"]
   */
  queryKey?: QueryKey
  onSuccess?: (data: any) => void
  onError?: (error: any) => void
}

export const useBoldPaymentStatusStream = ({
  sessionId,
  enabled = true,
  client = boldAdminSdk,
  queryKey = boldQueryKeys.orders(),
  onSuccess,
  onError,
}: UseBoldStatusStreamOptions) => {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<BoldPaymentStreamStatus | "idle">("idle")
  const [lastData, setLastData] = useState<any>(null)

  useEffect(() => {
    if (!sessionId || !enabled) {
      setStatus("idle")
      return
    }

    const unsubscribe = client.subscribeToPaymentStatus(sessionId, {
      onStatusChange: (newStatus: BoldPaymentStreamStatus, data: any) => {
        setStatus(newStatus)
        if (data) setLastData(data)
      },
      onSuccess: (data: any) => {
        if (queryKey && queryKey.length > 0) {
          queryClient.invalidateQueries({ queryKey: queryKey as any })
        }
        onSuccess?.(data)
      },
      onError: (err: any) => {
        onError?.(err)
      },
    })

    return () => {
      unsubscribe()
    }
  }, [sessionId, enabled, client, queryKey, queryClient, onSuccess, onError])

  return {
    status,
    isPending: status === "pending",
    isCaptured: status === "captured",
    isError: status === "error",
    data: lastData,
  }
}