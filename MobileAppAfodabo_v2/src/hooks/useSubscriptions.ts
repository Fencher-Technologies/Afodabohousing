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
    mutationFn: ({ plan_id, phone_number }: { plan_id: string; phone_number?: string }) =>
      subscriptionsService.create(plan_id, phone_number),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-subscription"] });
    },
  });
}
