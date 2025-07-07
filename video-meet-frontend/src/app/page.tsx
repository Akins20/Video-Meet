import LandingPage from "@/components/pages/LandingPage";
import AuthRedirectWrapper from "@/wrapper/AuthRedirectWrapper";

export default function Home() {
  return (
    <div className="min-h-screen">

      <AuthRedirectWrapper>
        <LandingPage />
      </AuthRedirectWrapper>
    </div>
  );
}
