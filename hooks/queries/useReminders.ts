import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createReminder,
  deleteReminder,
  listReminders,
  toggleReminder,
  type CreateReminderInput,
  type Reminder,
} from '@/services/reminders';

export function useReminders(userId: string | undefined) {
  return useQuery<Reminder[]>({
    queryKey: ['reminders', userId ?? 'anon'],
    enabled: Boolean(userId),
    staleTime: 30 * 1000,
    queryFn: () => (userId ? listReminders(userId) : Promise.resolve([])),
  });
}

export function useCreateReminder(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateReminderInput) => {
      if (!userId) throw new Error('Sign in to create reminders');
      const r = await createReminder(userId, input);
      if (!r) throw new Error('Could not create the reminder');
      return r;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders', userId] }),
  });
}

export function useToggleReminder(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reminder: Reminder) => {
      const r = await toggleReminder(reminder);
      if (!r) throw new Error('Could not update reminder');
      return r;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders', userId] }),
  });
}

export function useDeleteReminder(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reminder: Reminder) => {
      const ok = await deleteReminder(reminder);
      if (!ok) throw new Error('Could not delete reminder');
      return reminder.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders', userId] }),
  });
}
