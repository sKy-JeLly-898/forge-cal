import { createEventTypeAction } from "@/app/(app)/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function NewEventTypeForm() {
  return (
    <form action={createEventTypeAction} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" placeholder="Strategy call" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <Input id="timezone" name="timezone" placeholder="America/New_York" required defaultValue="UTC" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="durationMinutes">Duration (minutes)</Label>
        <Input id="durationMinutes" name="durationMinutes" type="number" min={15} max={180} defaultValue={30} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slotIntervalMin">Slot interval (minutes)</Label>
        <Input id="slotIntervalMin" name="slotIntervalMin" type="number" min={15} max={120} defaultValue={30} required />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" placeholder="What this meeting is about" />
      </div>

      <div className="md:col-span-2">
        <Button type="submit">Create Event Type</Button>
      </div>
    </form>
  );
}
