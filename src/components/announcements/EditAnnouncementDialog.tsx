import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useUpdateAnnouncement } from '@/hooks/useAnnouncements';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import type { Announcement } from '@/lib/types';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be 100 characters or less'),
  content: z.string().max(2000, 'Content must be 2000 characters or less').optional(),
  priority: z.enum(['normal', 'important']),
});

type FormData = z.infer<typeof formSchema>;

interface EditAnnouncementDialogProps {
  announcement: Announcement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAnnouncementDialog({ announcement, open, onOpenChange }: EditAnnouncementDialogProps) {
  const { currentTeam } = useAuth();
  const updateAnnouncement = useUpdateAnnouncement();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: '',
      priority: 'normal',
    },
  });

  // Reset form when announcement changes
  useEffect(() => {
    if (announcement) {
      form.reset({
        title: announcement.title,
        content: announcement.content || '',
        priority: announcement.priority,
      });
    }
  }, [announcement, form]);

  const onSubmit = async (data: FormData) => {
    if (!announcement || !currentTeam?.id) return;

    try {
      await updateAnnouncement.mutateAsync({
        id: announcement.id,
        team_id: currentTeam.id,
        title: data.title,
        content: data.content,
        priority: data.priority,
      });

      toast({
        title: 'Announcement updated',
        description: 'Your changes have been saved.',
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update announcement. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Announcement</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Announcement title" maxLength={100} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content (optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add more details..." 
                      maxLength={2000}
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="normal" id="edit-normal" />
                        <label htmlFor="edit-normal" className="text-sm cursor-pointer">Normal</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="important" id="edit-important" />
                        <label htmlFor="edit-important" className="text-sm cursor-pointer">Important</label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateAnnouncement.isPending}>
                {updateAnnouncement.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
