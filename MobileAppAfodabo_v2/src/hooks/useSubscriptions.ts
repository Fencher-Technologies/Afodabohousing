import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { subscriptionsService } from "../services/subscriptions";

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ["subscription-plans"],
    queryFn: () => subscriptionsService.getPlans(),
  });
}

export function useCurrentSubscription() {
  return useQuery({
    queryKey: ["current-subscription"],
    queryFn: () => subscriptionsService.getCurrent(),
  });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ plan_id, callback_url }: { plan_id: string; callback_url?: string }) =>
      subscriptionsService.create(plan_id, callback_url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-subscription"] });
    },
  });
}
