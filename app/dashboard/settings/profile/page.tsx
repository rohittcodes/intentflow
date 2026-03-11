"use client";

import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Camera, Loader2, Save, User as UserIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ProfileSettingsPage() {
  const { user, isLoaded } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Initialize state once user is loaded
  useEffect(() => {
    if (user && isLoaded) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
    }
  }, [user, isLoaded]);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      await user.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      toast.success("Profile updated successfully");
    } catch (error: any) {
      console.error(error);
      toast.error(error.errors?.[0]?.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate size (e.g. 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploadingImage(true);
    try {
      await user.setProfileImage({ file });
      toast.success("Profile picture updated");
    } catch (error: any) {
      console.error(error);
      toast.error(error.errors?.[0]?.message || "Failed to upload image");
    } finally {
      setIsUploadingImage(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full pb-8"
    >
      <PageHeader title="Profile" parent="Settings" />

      <Card className="border-border shadow-sm overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/5 to-background border-b border-border/50" />
        
        <CardContent className="px-6 sm:px-10 pb-10">
          <div className="relative flex flex-col sm:flex-row gap-6 sm:gap-10 -mt-12 sm:-mt-10 items-start">
            
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <Avatar className="h-28 w-28 rounded-2xl border-4 border-background shadow-xl bg-muted">
                  <AvatarImage src={user?.imageUrl} className="object-cover" />
                  <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary rounded-2xl">
                    {user?.firstName?.charAt(0) || <UserIcon className="h-10 w-10 text-muted-foreground/50" />}
                  </AvatarFallback>
                </Avatar>
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl cursor-pointer disabled:cursor-not-allowed"
                >
                  {isUploadingImage ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  ) : (
                    <>
                      <Camera className="h-6 w-6 text-white mb-1" />
                      <span className="text-[10px] text-white font-bold uppercase tracking-widest">Change</span>
                    </>
                  )}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/png, image/jpeg, image/webp" 
                  className="hidden"
                />
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                JPG, PNG. Max 5MB.
              </p>
            </div>

            {/* Form Section */}
            <div className="flex-1 w-full space-y-6 pt-12 sm:pt-14">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">First Name</Label>
                  <Input 
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="E.g. John"
                    className="h-9 shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Last Name</Label>
                  <Input 
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="E.g. Doe"
                    className="h-9 shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Primary Email Address</Label>
                <div className="flex items-center h-9 px-3 py-1 bg-muted/30 border border-border/50 rounded-xl">
                  <span className="text-sm font-medium text-muted-foreground/80">{user?.primaryEmailAddress?.emailAddress}</span>
                </div>
                <p className="text-[10px] text-muted-foreground italic mt-1">Email addresses cannot be changed here. Contact support if you need to migrate your account.</p>
              </div>

              <div className="pt-6 border-t border-border/50 flex justify-end">
                <Button 
                  onClick={handleSaveProfile}
                  disabled={isSaving || (firstName === user?.firstName && lastName === user?.lastName)}
                  className="h-9 px-8 font-bold uppercase tracking-widest text-[10px]"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
