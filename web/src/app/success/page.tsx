"use client";

import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, ArrowRight, Home, LayoutDashboard, Settings } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/app/components/ui/card";
import Button from "@/app/components/ui/button";

export default function SuccessPage() {
  return (
    <div className="min-h-[calc(100dvh-4rem)] w-full bg-gradient-to-b from-primary/5 via-background to-background flex items-center justify-center px-4">
      <div className="max-w-xl w-full">
        <Card className="relative overflow-hidden border-border/80 shadow-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(11,25,87,0.08),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(11,25,87,0.06),transparent_40%)]" />

          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-sm animate-in fade-in zoom-in duration-500">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <CardTitle className="text-2xl font-semibold">Successfully connected with Google</CardTitle>
            <p className="text-sm text-muted-foreground">
              Your Google account is now linked. We\'ll start syncing data shortly.
            </p>
          </CardHeader>

          <CardContent>
            <div className="flex items-center justify-center gap-4 py-3">
              <div className="flex items-center gap-2 rounded-full border px-3 py-1.5 bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/50">
                <span className="inline-block h-4 w-4 rounded-sm bg-[#EA4335]" />
                <span className="inline-block h-4 w-4 rounded-sm bg-[#FBBC04]" />
                <span className="inline-block h-4 w-4 rounded-sm bg-[#34A853]" />
                <span className="inline-block h-4 w-4 rounded-sm bg-[#4285F4]" />
                <span className="ml-1 text-xs font-medium text-slate-600">Google Connected</span>
              </div>
            </div>

            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              <Link href="/dashboard" className="sm:col-span-2">
                <Button className="w-full group">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Go to dashboard
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>

              <Link href="/settings/integrations">
                <Button variant="secondary" className="w-full">
                  <Settings className="mr-2 h-4 w-4" />
                  Manage integrations
                </Button>
              </Link>
            </div>

            <div className="mt-3 flex items-center justify-center">
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center">
                <Home className="mr-1.5 h-4 w-4" />
                Back to home
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="mx-auto mt-6 max-w-xl rounded-xl border bg-white p-3 text-center text-sm text-muted-foreground">
          Tip: You can disconnect or reconnect Google anytime from Settings → Integrations.
        </div>
      </div>
    </div>
  );
}

