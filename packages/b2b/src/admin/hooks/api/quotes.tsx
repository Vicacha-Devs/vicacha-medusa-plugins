import { HttpTypes } from "@medusajs/framework/types";
import { ClientHeaders, FetchError } from "@medusajs/js-sdk";
import {
  QueryKey,
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import {
  AdminCreateQuoteMessage,
  AdminQuoteResponse,
  QuoteFilterParams,
  StoreQuoteResponse,
  StoreQuotesResponse,
} from "../../../types";
import { ordersQueryKeys, queryKeysFactory, sdk } from "@vicacha-devs/medusa-shared-admin/admin";


export const orderPreviewQueryKey = queryKeysFactory("custom_orders");
export const quoteQueryKey = queryKeysFactory("quote");

export const useQuotes = (
  query: QuoteFilterParams,
  options?: UseQueryOptions<
    StoreQuotesResponse,
    FetchError,
    StoreQuotesResponse,
    QueryKey
  >
) => {
  const fetchQuotes = (query: QuoteFilterParams, headers?: ClientHeaders) =>
    sdk.client.fetch<StoreQuotesResponse>(`/admin/b2b/quotes`, {
      query,
      headers,
    });

  const { data, ...rest } = useQuery({
    ...options,
    queryFn: () => fetchQuotes(query)!,
    queryKey: quoteQueryKey.list(query),
  });

  return { ...data, ...rest };
};

export const useQuote = (
  id: string,
  query?: QuoteFilterParams,
  options?: UseQueryOptions<
    StoreQuoteResponse,
    FetchError,
    StoreQuoteResponse,
    QueryKey
  >
) => {
  const fetchQuote = (
    id: string,
    query?: QuoteFilterParams,
    headers?: ClientHeaders
  ) =>
    sdk.client.fetch<StoreQuoteResponse>(`/admin/b2b/quotes/${id}`, {
      query,
      headers,
    });

  const { data, ...rest } = useQuery({
    queryFn: () => fetchQuote(id, query),
    queryKey: quoteQueryKey.detail(id),
    ...options,
  });

  return { ...data, ...rest };
};

export const useAddItemsToQuote = (
  id: string,
  options?: UseMutationOptions<
    HttpTypes.AdminOrderEditPreviewResponse,
    FetchError,
    HttpTypes.AdminAddOrderEditItems
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (payload: HttpTypes.AdminAddOrderEditItems) =>
      sdk.admin.orderEdit.addItems(id, payload),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({ queryKey: orderPreviewQueryKey.detail(id) });
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.preview(id) });
      options?.onSuccess?.(data, variables, context);
    },
  });
};

export const useUpdateQuoteItem = (
  id: string,
  options?: UseMutationOptions<
    HttpTypes.AdminOrderEditPreviewResponse,
    FetchError,
    HttpTypes.AdminUpdateOrderEditItem & { itemId: string }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: ({
      itemId,
      ...payload
    }: HttpTypes.AdminUpdateOrderEditItem & { itemId: string }) => {
      return sdk.admin.orderEdit.updateOriginalItem(id, itemId, payload);
    },
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({ queryKey: orderPreviewQueryKey.detail(id) });
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.preview(id) });
      options?.onSuccess?.(data, variables, context);
    },
  });
};

export const useRemoveQuoteItem = (
  id: string,
  options?: UseMutationOptions<
    HttpTypes.AdminOrderEditPreviewResponse,
    FetchError,
    string
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (actionId: string) =>
      sdk.admin.orderEdit.removeAddedItem(id, actionId),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({ queryKey: orderPreviewQueryKey.detail(id) });
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.preview(id) });
      options?.onSuccess?.(data, variables, context);
    },
  });
};

export const useUpdateAddedQuoteItem = (
  id: string,
  options?: UseMutationOptions<
    HttpTypes.AdminOrderEditPreviewResponse,
    FetchError,
    HttpTypes.AdminUpdateOrderEditItem & { actionId: string }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: ({
      actionId,
      ...payload
    }: HttpTypes.AdminUpdateOrderEditItem & { actionId: string }) => {
      return sdk.admin.orderEdit.updateAddedItem(id, actionId, payload);
    },
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({ queryKey: orderPreviewQueryKey.detail(id) });
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.preview(id) });
      options?.onSuccess?.(data, variables, context);
    },
  });
};

export const useConfirmQuote = (
  id: string,
  options?: UseMutationOptions<
    HttpTypes.AdminOrderEditPreviewResponse,
    FetchError,
    void
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: () => sdk.admin.orderEdit.request(id),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({ queryKey: orderPreviewQueryKey.details() });
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.details() });
      queryClient.invalidateQueries({ queryKey: quoteQueryKey.details() });
      queryClient.invalidateQueries({ queryKey: quoteQueryKey.lists() });
      options?.onSuccess?.(data, variables, context);
    },
  });
};

export const useSendQuote = (
  id: string,
  options?: UseMutationOptions<AdminQuoteResponse, FetchError, void>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: () =>
      sdk.client.fetch<AdminQuoteResponse>(`/admin/b2b/quotes/${id}/send`, {
        method: "POST",
      }),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: orderPreviewQueryKey.details(),
      });
      queryClient.invalidateQueries({
        queryKey: quoteQueryKey.detail(id),
      });
      queryClient.invalidateQueries({
        queryKey: quoteQueryKey.lists(),
      });
      options?.onSuccess?.(data, variables, context);
    },
  });
};

export const useRejectQuote = (
  id: string,
  options?: UseMutationOptions<AdminQuoteResponse, FetchError, void>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: () =>
      sdk.client.fetch<AdminQuoteResponse>(`/admin/b2b/quotes/${id}/reject`, {
        method: "POST",
      }),
    onSuccess: (data: AdminQuoteResponse, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: orderPreviewQueryKey.details(),
      });
      queryClient.invalidateQueries({
        queryKey: quoteQueryKey.detail(id),
      });
      queryClient.invalidateQueries({
        queryKey: quoteQueryKey.lists(),
      });
      options?.onSuccess?.(data, variables, context);
    },
  });
};

export const useCreateQuoteMessage = (
  id: string,
  options?: UseMutationOptions<
    AdminQuoteResponse,
    FetchError,
    AdminCreateQuoteMessage
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (body: AdminCreateQuoteMessage) =>
      sdk.client.fetch<AdminQuoteResponse>(`/admin/b2b/quotes/${id}/messages`, {
        body,
        method: "POST",
      }),
    onSuccess: (data: AdminQuoteResponse, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: quoteQueryKey.details(),
      });
      options?.onSuccess?.(data, variables, context);
    },
  });
};
