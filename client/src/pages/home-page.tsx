import { SiteHeader } from "@/components/site-header";
import { PhotoFeed } from "@/components/photo-feed";
import { UploadDialog } from "@/components/upload-dialog";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto py-6 px-4 md:px-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Fitness Feed</h1>
          <UploadDialog />
        </div>
        <PhotoFeed />
      </main>
    </div>
  );
}
