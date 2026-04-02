import { useQueryClient, useMutation } from "@tanstack/react-query";
import {
  useGetGoals,
  useCreateGoal,
  useGetTodayTask,
  useRecordTaskAction,
  useGenerateTasks,
  useGetGoalTasks,
  getGetGoalsQueryKey,
  getGetTodayTaskQueryKey,
  getGetGoalStateQueryKey
} from "@workspace/api-client-react";
import { customFetch } from "@workspace/api-client-react";
import type { CreateGoalBody, TaskActionBody } from "@workspace/api-client-react";

// Wrappers around generated hooks to add standard invalidation and error handling patterns

export function useGoals() {
  return useGetGoals();
}

export function useCreateDriftGoal() {
  const queryClient = useQueryClient();
  const mutation = useCreateGoal();

  return {
    ...mutation,
    mutateAsync: async (data: CreateGoalBody) => {
      const result = await mutation.mutateAsync({ data });
      queryClient.invalidateQueries({ queryKey: getGetGoalsQueryKey() });
      return result;
    }
  };
}

export function useGenerateDriftTasks() {
  const queryClient = useQueryClient();
  const mutation = useGenerateTasks();

  return {
    ...mutation,
    mutateAsync: async (id: number) => {
      const result = await mutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getGetTodayTaskQueryKey(id) });
      return result;
    }
  };
}

export function useDriftTodayTask(goalId: number) {
  return useGetTodayTask(goalId, {
    query: {
      retry: false, // Don't retry on 404 so we can show "all done" quickly
      staleTime: 1000 * 60 * 5, // 5 mins
    }
  });
}

export function useGoalTasks(goalId: number) {
  return useGetGoalTasks(goalId, {
    query: {
      staleTime: 1000 * 60 * 2,
    }
  });
}

export function useUpdateGoalContext() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ goalId, context }: { goalId: number; context: string }) => {
      return customFetch<{ id: number; context: string | null }>(`/api/goals/${goalId}`, {
        method: "PATCH",
        body: JSON.stringify({ context }),
        headers: { "content-type": "application/json" },
      });
    },
    onSuccess: (_data, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: getGetTodayTaskQueryKey(goalId) });
      queryClient.invalidateQueries({ queryKey: getGetGoalsQueryKey() });
    },
  });
}

export function useRecordDriftAction() {
  const queryClient = useQueryClient();
  const mutation = useRecordTaskAction();

  return {
    ...mutation,
    mutateAsync: async ({ goalId, taskId, action }: { goalId: number, taskId: number, action: TaskActionBody['action'] }) => {
      const result = await mutation.mutateAsync({
        id: goalId,
        taskId: taskId,
        data: { action }
      });
      
      // Invalidate everything related to this goal to refresh the UI
      queryClient.invalidateQueries({ queryKey: getGetTodayTaskQueryKey(goalId) });
      queryClient.invalidateQueries({ queryKey: getGetGoalStateQueryKey(goalId) });
      
      return result;
    }
  };
}
