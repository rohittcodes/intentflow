"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck, ArrowRight, UserPlus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [isAccepting, setIsAccepting] = useState(false);

  const inviteDetails = useQuery(api.workspaceInvites.getByToken, { token });
  const acceptInvite = useMutation(api.workspaceInvites.accept);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const result = await acceptInvite({ token });
      toast.success("Successfully joined workspace!");
      // Briefly wait to let Convex state settle, then redirect to dashboard
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (error: any) {
      toast.error(error.message);
      setIsAccepting(false);
    }
  };

  if (inviteDetails === undefined || !isLoaded) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Verifying invitation...</p>
      </div>
    );
  }

  if (inviteDetails === null) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-6 bg-card border rounded-2xl p-8 shadow-sm">
          <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-2">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">Invalid Invitation</h1>
            <p className="text-sm text-muted-foreground">
              This invite link is invalid, expired, or has been revoked by the workspace administrator.
            </p>
          </div>
          <Button className="w-full" onClick={() => router.push("/")}>
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  const { invite, workspace } = inviteDetails;

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-muted/20 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-card border shadow-xl rounded-3xl overflow-hidden relative"
      >
        <div className="h-32 bg-primary/10 relative flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          {workspace.icon ? (
            <span className="text-4xl relative z-10">{workspace.icon}</span>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-primary relative z-10 flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-8 h-8 text-primary-foreground" />
            </div>
          )}
        </div>

        <div className="px-8 pb-8 pt-4 text-center">
          <Badge variant="outline" className="mb-6 mx-auto uppercase tracking-widest text-[9px] font-bold">
            Workspace Invitation
          </Badge>

          <h1 className="text-2xl font-bold tracking-tight mb-2">
            Join <span className="text-primary">{workspace.name}</span>
          </h1>

          <p className="text-sm text-muted-foreground mb-8">
            You've been invited to collaborate in this workspace as a <strong className="capitalize text-foreground">{invite.role}</strong>.
          </p>

          <SignedIn>
            {invite.status === "pending" ? (
              <div className="space-y-4">
                <Button
                  size="lg"
                  className="w-full font-bold h-14 rounded-xl shadow-md transition-all active:scale-[0.98]"
                  onClick={handleAccept}
                  disabled={isAccepting}
                >
                  {isAccepting ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <>Accept Invitation <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
                <div className="text-[10px] text-muted-foreground">
                  Signed in as <span className="font-bold text-foreground">{user?.primaryEmailAddress?.emailAddress}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 font-bold text-sm">
                  This invitation has already been {invite.status}.
                </div>
                <Button variant="secondary" className="w-full" onClick={() => router.push("/dashboard")}>
                  Go to Dashboard
                </Button>
              </div>
            )}
          </SignedIn>

          <SignedOut>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-muted border text-sm text-muted-foreground mb-4">
                To accept this invitation, you need to sign in or create an IntentFlow account.
              </div>
              <SignInButton mode="modal" forceRedirectUrl={`/invite/${token}`}>
                <Button size="lg" className="w-full font-bold h-14 rounded-xl shadow-md transition-all active:scale-[0.98]">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Sign in to Accept
                </Button>
              </SignInButton>
            </div>
          </SignedOut>
        </div>
      </motion.div>
    </div>
  );
}
