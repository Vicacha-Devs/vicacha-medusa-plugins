import { useEffect } from "react"
import { QueryKey } from "@tanstack/react-query"

import { boldAdminSdk, BoldApiClient } from "../sdk/client"
import { BoldMutationHookOptions, BoldStatusStreamCallbacks } from "../types"

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


interface UseBoldPaymentStatusStreamProps
  extends BoldStatusStreamCallbacks,
    BoldMutationHookOptions {
  sessionId: string | null
  enabled?: boolean
}

export const useBoldPaymentStatusStream = ({
  sessionId,
  enabled = true,
  client,
  onStatusChange,
  onSuccess,
  onError,
}: UseBoldPaymentStatusStreamProps) => {
  const sdk = client || boldAdminSdk

  useEffect(() => {
    if (!sessionId || !enabled) {
      return
    }

    const unsubscribe = sdk.subscribeToPaymentStatus(sessionId, {
      onStatusChange,
      onSuccess,
      onError,
    })

    return () => {
      unsubscribe()
    }
  }, [sessionId, enabled, sdk])
}