import { useQuery } from '@tanstack/react-query'
import { getAdminDashboardData } from '@/services/adminDashboardData'

export function useAdminDashboardData() {
  return useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: getAdminDashboardData,
    staleTime: 60_000,
    retry: 1,
  })
}

