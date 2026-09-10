import { FetchError } from "@medusajs/js-sdk";
import {
  QueryKey,
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import { queryKeysFactory, sdk } from "@vicacha-devs/medusa-shared-admin/admin";
import {
  AdminCompaniesResponse,
  AdminCompanyResponse,
  AdminCreateCompany,
  AdminUpdateCompany,
} from "../../../types";


export const companyQueryKey = queryKeysFactory("company");

export const useCompanies = (
  query?: Record<string, any>,
  options?: UseQueryOptions<
    AdminCompaniesResponse,
    FetchError,
    AdminCompaniesResponse,
    QueryKey
  >
) => {
  const fetchCompanies = async () =>
    sdk.client.fetch<AdminCompaniesResponse>(`/admin/b2b/companies`, {
      method: "GET",
      query,
    });

  return useQuery({
    queryKey: companyQueryKey.list(query),
    queryFn: fetchCompanies,
    ...options,
  });
};

export const useCompany = (
  companyId: string,
  query?: Record<string, any>,
  options?: UseQueryOptions<
    AdminCompanyResponse,
    FetchError,
    AdminCompanyResponse,
    QueryKey
  >
) => {
  const filterQuery = new URLSearchParams(query).toString();

  const fetchCompany = async () =>
    sdk.client.fetch<AdminCompanyResponse>(
      `/admin/b2b/companies/${companyId}${filterQuery ? `?${filterQuery}` : ""}`,
      {
        method: "GET",
      }
    );

  return useQuery({
    queryKey: companyQueryKey.detail(companyId),
    queryFn: fetchCompany,
    ...options,
  });
};

type CreateCompanyInput = AdminCreateCompany & {
  group_id?: string;
  requires_admin_approval?: boolean;
  requires_sales_manager_approval?: boolean;
};

export const useCreateCompany = (
  options?: UseMutationOptions<AdminCompanyResponse, FetchError, CreateCompanyInput>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ group_id, requires_admin_approval, requires_sales_manager_approval, ...company }: CreateCompanyInput) => {
      const result = await sdk.client.fetch<AdminCompanyResponse>("/admin/b2b/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: company,
      });

      const created = (result as any).companies?.[0] ?? (result as any).company;
      const companyId: string | undefined = created?.id;

      if (companyId) {
        const postCreation: Promise<any>[] = [];

        if (group_id) {
          postCreation.push(
            sdk.client.fetch(`/admin/b2b/companies/${companyId}/customer-group`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: { group_id },
            })
          );
        }

        const approvalSettingsId: string | undefined = created?.approval_settings?.id;
        if (approvalSettingsId && (requires_admin_approval || requires_sales_manager_approval)) {
          postCreation.push(
            sdk.client.fetch(`/admin/b2b/companies/${companyId}/approval-settings`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: { id: approvalSettingsId, requires_admin_approval, requires_sales_manager_approval },
            })
          );
        }

        await Promise.all(postCreation);
      }

      return result;
    },
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({ queryKey: companyQueryKey.lists() });
      queryClient.invalidateQueries({ queryKey: companyQueryKey.detail(data?.company?.id) });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useUpdateCompany = (
  companyId: string,
  options?: UseMutationOptions<
    AdminCompanyResponse,
    FetchError,
    AdminUpdateCompany
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (company: AdminUpdateCompany) =>
      sdk.client.fetch<AdminCompanyResponse>(`/admin/b2b/companies/${companyId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: company,
      }),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.detail(companyId),
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useDeleteCompany = (
  companyId: string,
  options?: UseMutationOptions<void, FetchError>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      sdk.client.fetch<void>(`/admin/b2b/companies/${companyId}`, {
        method: "DELETE",
      }),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.lists(),
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useAddCompanyToCustomerGroup = (
  companyId: string,
  options?: UseMutationOptions<void, FetchError, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) =>
      sdk.client.fetch(`/admin/b2b/companies/${companyId}/customer-group`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: { group_id: groupId },
      }),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.detail(companyId),
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useRemoveCompanyFromCustomerGroup = (
  companyId: string,
  options?: UseMutationOptions<void, FetchError, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) =>
      sdk.client.fetch(
        `/admin/b2b/companies/${companyId}/customer-group/${groupId}`,
        {
          method: "DELETE",
          headers: {
            Accept: "text/plain",
          },
        }
      ),
    onSuccess: (_, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.detail(companyId),
      });
      options?.onSuccess?.(undefined, variables, context);
    },
    ...options,
  });
};
