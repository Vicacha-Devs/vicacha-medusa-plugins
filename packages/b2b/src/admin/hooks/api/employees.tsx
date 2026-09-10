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
  AdminCreateEmployee,
  AdminEmployeeResponse,
  AdminEmployeesResponse,
  AdminUpdateEmployee,
} from "../../../types";

export const employeeQueryKey = queryKeysFactory("employee");

export const useEmployees = (
  companyId: string,
  query?: Record<string, any>,
  options?: UseQueryOptions<
    AdminEmployeesResponse,
    FetchError,
    AdminEmployeesResponse,
    QueryKey
  >
) => {
  const { fields: _fields, ...safeQuery } = (query ?? {}) as any

  return useQuery({
    queryKey: employeeQueryKey.list({ companyId, ...safeQuery }),
    queryFn: () =>
      sdk.client.fetch<AdminEmployeesResponse>(
        `/admin/b2b/companies/${companyId}/employees`,
        { method: "GET", query: safeQuery }
      ),
    ...options,
  });
};

export const useEmployee = (
  companyId: string,
  employeeId: string,
  options?: UseQueryOptions<
    AdminEmployeeResponse,
    FetchError,
    AdminEmployeeResponse,
    QueryKey
  >
) => {
  return useQuery({
    queryKey: employeeQueryKey.detail(employeeId),
    queryFn: () =>
      sdk.client.fetch<AdminEmployeeResponse>(
        `/admin/b2b/companies/${companyId}/employees/${employeeId}`,
        { method: "GET" }
      ),
    enabled: !!companyId && !!employeeId,
    ...options,
  });
};

export const useCreateEmployee = (
  companyId: string,
  options?: UseMutationOptions<
    AdminEmployeeResponse,
    FetchError,
    AdminCreateEmployee
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (employee: AdminCreateEmployee) =>
      sdk.client.fetch<AdminEmployeeResponse>(
        `/admin/b2b/companies/${companyId}/employees`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: employee,
        }
      ),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: employeeQueryKey.lists(),
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useUpdateEmployee = (
  companyId: string,
  employeeId: string,
  options?: UseMutationOptions<
    AdminEmployeeResponse,
    FetchError,
    AdminUpdateEmployee
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (employee: AdminUpdateEmployee) =>
      sdk.client.fetch<AdminEmployeeResponse>(
        `/admin/b2b/companies/${companyId}/employees/${employeeId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: employee,
        }
      ),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: employeeQueryKey.detail(employeeId),
      });
      queryClient.invalidateQueries({
        queryKey: employeeQueryKey.lists(),
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useDeleteEmployee = (
  companyId: string,
  options?: UseMutationOptions<void, FetchError, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (employeeId: string) =>
      sdk.client.fetch<void>(
        `/admin/b2b/companies/${companyId}/employees/${employeeId}`,
        {
          method: "DELETE",
        }
      ),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: employeeQueryKey.lists(),
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};
