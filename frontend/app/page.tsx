import { HomePageClient } from "@/components/landing/home-page-client";

type HomePageProps = {
  searchParams: Promise<{
    auth?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const authMode =
    params.auth === "login" || params.auth === "register" ? params.auth : null;

  return <HomePageClient initialAuthMode={authMode} />;
}
