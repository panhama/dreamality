import StoryViewer from '@/components/StoryViewer';

// Client-side fetch for simplicity; use getServerSideProps if needed
export default function StoryPage({ params }: { params: { id: string } }) {
  // In real: Fetch from API/DB using id; here assume props passed or fetch
  // For MVP, you can store in memory or use Payload CMS for persistence
  return <StoryViewer storyText="..." imageUrls={[]} audioUrls={[]} />;
}