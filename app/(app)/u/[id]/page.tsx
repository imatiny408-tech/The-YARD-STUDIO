import Profile from "@/components/app/Profile";
import { CREATORS } from "@/lib/data";

export function generateStaticParams() {
  return CREATORS.map((c) => ({ id: c.id }));
}

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Profile id={id} />;
}
