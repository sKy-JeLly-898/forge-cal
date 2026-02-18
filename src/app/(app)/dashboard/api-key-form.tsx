import { createApiKeyAction } from "@/app/(app)/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ApiKeyForm() {
  return (
    <form action={createApiKeyAction} className="space-y-3">
      <Label htmlFor="label">API key label</Label>
      <div className="flex gap-3">
        <Input id="label" name="label" placeholder="Production key" required />
        <Button type="submit">Create Key</Button>
      </div>
    </form>
  );
}
