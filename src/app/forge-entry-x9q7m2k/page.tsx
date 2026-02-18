import Link from "next/link";

import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivateLoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Sign in to ForgeCal</CardTitle>
          <CardDescription>Approved client and admin accounts only.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
          >
            <Button className="w-full" type="submit">
              Continue with Google
            </Button>
          </form>
          <Link className="block text-center text-sm text-slate-600 hover:text-slate-900" href="/">
            Back to home
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
