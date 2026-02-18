import { createWebhookAction } from "@/app/(app)/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function WebhookForm() {
  return (
    <form action={createWebhookAction} className="space-y-3">
      <Label htmlFor="webhook-url">Webhook URL</Label>
      <div className="flex gap-3">
        <Input id="webhook-url" name="url" placeholder="https://forgewwb-lemon.vercel.app/api/forgecal/webhook" required />
        <Button type="submit">Add Webhook</Button>
      </div>
    </form>
  );
}
