import { Button } from "@/components/ui/button";
import { signOutAction } from "./actions";

export function SignOutButton({ label }: { label: string }) {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="secondary">
        {label}
      </Button>
    </form>
  );
}
