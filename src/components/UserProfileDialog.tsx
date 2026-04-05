import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Camera, Loader2, UserCircle, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserProfileDialog({ open, onOpenChange }: Props) {
  const { user, profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const photoUrl = preview || (profile as any)?.photo_url || null;

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5 Mo");
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload
    uploadPhoto(file);
  }, [user]);

  const uploadPhoto = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}.${ext}`;

      // Resize image before upload
      const resized = await resizeImage(file, 400);

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, resized, { upsert: true, contentType: resized.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const newUrl = urlData.publicUrl + "?t=" + Date.now();

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ photo_url: newUrl } as any)
        .eq("id", user.id);
      if (updateError) throw updateError;

      setPreview(newUrl);
      toast.success("Photo mise à jour");
    } catch (err: any) {
      toast.error("Erreur : " + err.message);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!user) return;
    setUploading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ photo_url: null } as any)
        .eq("id", user.id);
      if (error) throw error;
      setPreview(null);
      toast.success("Photo supprimée");
    } catch (err: any) {
      toast.error("Erreur : " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!uploading) { setPreview(null); onOpenChange(v); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-primary" />
            Mon profil
          </DialogTitle>
          <DialogDescription>Gérez votre photo de profil et vos informations</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* Avatar with upload overlay */}
          <div className="relative group">
            <Avatar className="h-24 w-24 ring-2 ring-border">
              <AvatarImage src={photoUrl || undefined} className="object-cover" />
              <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                {profile?.prenom?.[0]}{profile?.nom?.[0]}
              </AvatarFallback>
            </Avatar>
            <button
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              ) : (
                <Camera className="h-6 w-6 text-white" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Camera className="mr-2 h-4 w-4" />
              {photoUrl ? "Changer" : "Ajouter une photo"}
            </Button>
            {photoUrl && (
              <Button variant="ghost" size="sm" className="text-destructive" onClick={handleRemovePhoto} disabled={uploading}>
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
            )}
          </div>
        </div>

        {/* Read-only profile info */}
        <div className="space-y-3 border-t pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Prénom</Label>
              <p className="text-sm font-medium">{profile?.prenom || "—"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Nom</Label>
              <p className="text-sm font-medium">{profile?.nom || "—"}</p>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <p className="text-sm font-medium">{profile?.email || "—"}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fonction</Label>
            <p className="text-sm font-medium">{profile?.fonction || "—"}</p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Resize an image file to max dimension, returns a new Blob */
async function resizeImage(file: File, maxDim: number): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim) {
        resolve(file);
        return;
      }
      const ratio = Math.min(maxDim / width, maxDim / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: "image/jpeg" }));
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        0.85
      );
    };
    img.src = URL.createObjectURL(file);
  });
}