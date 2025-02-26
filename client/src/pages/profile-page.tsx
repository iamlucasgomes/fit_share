import { useAuth } from '@/hooks/use-auth';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Photo, User } from '@shared/schema';
import { useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { SiteHeader } from '@/components/site-header';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { UserListDialog } from '@/components/user-list-dialog';

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: user } = useQuery<User>({
    queryKey: [`/api/users/${id}`],
  });

  const { data: photos } = useQuery<Photo[]>({
    queryKey: [`/api/photos/user/${id}`],
  });

  const { data: isFollowing } = useQuery<{ isFollowing: boolean }>({
    queryKey: [`/api/users/${id}/following`],
    enabled: !!currentUser && currentUser.id !== id,
  });

  // Update bio and displayName state when user data is loaded
  useEffect(() => {
    if (user) {
      setBio(user.bio || '');
      setDisplayName(user.displayName || '');
    }
  }, [user]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      await handleUpdateProfile(data.url);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload profile picture',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateProfile = async (newAvatarUrl?: string) => {
    try {
      await apiRequest('PATCH', '/api/user/profile', {
        bio,
        displayName,
        avatarUrl: newAvatarUrl || user?.avatarUrl,
      });

      queryClient.invalidateQueries({ queryKey: [`/api/users/${id}`] });
      setIsEditing(false);
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    }
  };

  const handleFollow = async () => {
    try {
      await apiRequest('POST', `/api/users/${id}/follow`);
      queryClient.invalidateQueries({
        queryKey: [`/api/users/${id}/following`],
      });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${id}`] });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to follow user',
        variant: 'destructive',
      });
    }
  };

  const handleUnfollow = async () => {
    try {
      await apiRequest('POST', `/api/users/${id}/unfollow`);
      queryClient.invalidateQueries({
        queryKey: [`/api/users/${id}/following`],
      });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${id}`] });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to unfollow user',
        variant: 'destructive',
      });
    }
  };

  const { data: followers } = useQuery<User[]>({
    queryKey: [`/api/users/${id}/followers`],
  });

  if (!user) return null;

  const isOwnProfile = currentUser?.id === id;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto py-6 px-4 md:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative">
                <img
                  src={user.avatarUrl || 'https://via.placeholder.com/150'}
                  alt={user.displayName || user.username}
                  className="w-32 h-32 rounded-full object-cover"
                />
                {isOwnProfile && (
                  <Input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                )}
                {isOwnProfile && isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                )}
                {isOwnProfile && !isUploading && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change Photo
                  </Button>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">{user.displayName || user.username}</h2>
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Display Name</label>
                      <Input
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        placeholder="Enter display name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Bio</label>
                      <Textarea
                        value={bio}
                        onChange={e => setBio(e.target.value)}
                        placeholder="Tell us about yourself"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleUpdateProfile()}>Save</Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-muted-foreground mb-4">{user.bio || 'No bio yet'}</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      <UserListDialog
                        trigger={
                          <Button
                            variant="link"
                            className="p-0 h-auto font-normal"
                          >
                            {user.followerCount} followers
                          </Button>
                        }
                        title="Followers"
                        users={followers || []}
                      />
                    </p>
                    {isOwnProfile ? (
                      <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
                    ) : (
                      <Button onClick={isFollowing?.isFollowing ? handleUnfollow : handleFollow}>
                        {isFollowing?.isFollowing ? 'Unfollow' : 'Follow'}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <h3 className="text-2xl font-bold mt-8 mb-6">Photos</h3>
        {photos && photos.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {photos.map(photo => (
              <Dialog key={photo.id}>
                <DialogTrigger asChild>
                  <Card
                    className="overflow-hidden cursor-pointer"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <CardContent className="p-0">
                      <img
                        src={photo.imageUrl}
                        alt={photo.caption || 'Fitness progress'}
                        className="w-full aspect-square object-cover"
                      />
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <PhotoDetail photo={photo} />
                </DialogContent>
              </Dialog>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No photos yet</p>
        )}
      </main>
    </div>
  );
}

function PhotoDetail({ photo }: { photo: Photo }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <img
        src={photo.imageUrl}
        alt={photo.caption || 'Fitness progress'}
        className="w-full aspect-square object-cover rounded-lg"
      />
      <div className="space-y-4">
        {photo.caption && <p className="text-lg">{photo.caption}</p>}
        <p className="text-sm text-muted-foreground">
          {photo.likeCount || 0} likes • {photo.commentCount || 0} comments
        </p>
      </div>
    </div>
  );
}
