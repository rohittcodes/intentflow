"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { 
  Users, UserPlus, Trash2, Mail, Shield, ShieldCheck, ShieldAlert,
  MoreVertical, Copy, Clock, Loader2 
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Id } from "@/convex/_generated/dataModel";

export default function MembersPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [isInviting, setIsInviting] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);

  // Queries
  const members = useQuery(api.workspaceMembers.list, 
    activeWorkspaceId ? { workspaceId: activeWorkspaceId as Id<"workspaces"> } : "skip"
  );
  
  const invites = useQuery(api.workspaceInvites.list,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId as Id<"workspaces"> } : "skip"
  );

  // Mutations
  const createInvite = useMutation(api.workspaceInvites.create);
  const revokeInvite = useMutation(api.workspaceInvites.revoke);
  const removeMember = useMutation(api.workspaceMembers.remove);
  const updateRole = useMutation(api.workspaceMembers.updateRole);

  const handleInvite = async () => {
    if (!activeWorkspaceId) return;
    setIsInviting(true);
    setGeneratedInviteLink(null);

    try {
      const result = await createInvite({
        workspaceId: activeWorkspaceId as Id<"workspaces">,
        role: inviteRole,
        email: inviteEmail.trim() || undefined,
      });

      const inviteLink = `${window.location.origin}/invite/${result.token}`;
      setGeneratedInviteLink(inviteLink);
      toast.success("Invite link generated successfully!");
      setInviteEmail("");
    } catch (error: any) {
      toast.error(`Failed to create invite: ${error.message}`);
    } finally {
      setIsInviting(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleRevoke = async (inviteId: Id<"workspaceInvites">) => {
    try {
      await revokeInvite({ inviteId });
      toast.success("Invite revoked");
    } catch (error: any) {
      toast.error(`Failed to revoke invite: ${error.message}`);
    }
  };

  const handleUpdateRole = async (membershipId: Id<"workspaceMembers">, newRole: string) => {
    try {
      await updateRole({ membershipId, role: newRole });
      toast.success("Role updated");
    } catch (error: any) {
      toast.error(`Failed to update role: ${error.message}`);
    }
  };

  const handleRemoveMember = async (membershipId: Id<"workspaceMembers">) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    
    try {
      await removeMember({ membershipId });
      toast.success("Member removed");
    } catch (error: any) {
      toast.error(`Failed to remove member: ${error.message}`);
    }
  };

  const getRoleIcon = (role: string) => {
    switch(role) {
      case 'owner': return <ShieldAlert className="w-4 h-4 text-rose-500" />;
      case 'admin': return <ShieldCheck className="w-4 h-4 text-purple-500" />;
      case 'editor': return <Shield className="w-4 h-4 text-blue-500" />;
      default: return <Shield className="w-4 h-4 text-slate-400" />;
    }
  };

  if (!activeWorkspaceId) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full pb-8 space-y-8"
    >
      <PageHeader
        title="Team Members"
        parent="Settings"
        actions={
          <Button className="font-bold shrink-0" onClick={() => setIsInviteOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        }
      />

      {/* Invite Dialog — kept as a sibling to PageHeader */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite to Workspace</DialogTitle>
            <DialogDescription>
              Generate an invite link to allow someone to join this workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {generatedInviteLink ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-green-600 bg-green-50 p-2 rounded-lg border border-green-200">
                  Invite generated successfully! Share this link with the new member.
                </p>
                <div className="flex gap-2">
                  <Input readOnly value={generatedInviteLink} className="font-mono text-xs" />
                  <Button onClick={() => copyToClipboard(generatedInviteLink)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Email (Optional)</label>
                  <Input
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    If provided, this invite link can only be claimed by this specific email.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Role</label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin - Can invite users, manage billing</SelectItem>
                      <SelectItem value="editor">Editor - Can create and edit workflows</SelectItem>
                      <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => {
              setIsInviteOpen(false);
              setGeneratedInviteLink(null);
              setInviteEmail("");
            }}>
              Close
            </Button>
            {!generatedInviteLink && (
              <Button onClick={handleInvite} disabled={isInviting}>
                {isInviting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                Generate Link
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Pending Invites */}
      {invites !== undefined && invites.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Pending Invitations ({invites.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {invites.map((invite) => (
              <div key={invite._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-background rounded-lg border shadow-sm gap-4">
                <div className="flex flex-col">
                  <span className="text-sm font-bold">
                    {invite.email || <span className="text-muted-foreground italic">Anyone with link</span>}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] capitalize font-medium">{invite.role}</Badge>
                    <span className="text-[10px] text-muted-foreground">
                      Created {new Date(invite.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs font-bold" onClick={() => {
                    copyToClipboard(`${window.location.origin}/invite/${invite.token}`);
                  }}>
                    <Copy className="w-3 h-3 mr-2" /> Copy Link
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleRevoke(invite._id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active Members */}
      <Card>
        <CardHeader className="border-b bg-muted/20 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            Active Members
          </CardTitle>
          <CardDescription>
            The people who currently have access to this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {members === undefined ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading members...
            </div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No active members found.
            </div>
          ) : (
            <div className="divide-y relative">
              {members.map((membership: any) => (
                <div key={membership._id} className="flex items-center justify-between p-4 hover:bg-muted/10 transition-colors">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10 border shadow-sm">
                      <AvatarImage src={membership.user.imageUrl} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {membership.user.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold block leading-tight mb-1">{membership.user.name || "Unnamed User"}</span>
                      <span className="text-[11px] text-muted-foreground leading-tight">{membership.user.email || "No email"}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border text-xs font-semibold capitalize">
                      {getRoleIcon(membership.role)}
                      {membership.role}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Manage Roles</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleUpdateRole(membership._id, 'admin')} className="cursor-pointer">
                          <ShieldCheck className="w-4 h-4 mr-2 text-purple-500" /> Make Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateRole(membership._id, 'editor')} className="cursor-pointer">
                          <Shield className="w-4 h-4 mr-2 text-blue-500" /> Make Editor
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateRole(membership._id, 'viewer')} className="cursor-pointer">
                          <Shield className="w-4 h-4 mr-2 text-slate-400" /> Make Viewer
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleRemoveMember(membership._id)}
                          className="text-destructive focus:bg-destructive focus:text-destructive-foreground cursor-pointer font-bold"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Remove from Workspace
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
    </motion.div>
  );
}
