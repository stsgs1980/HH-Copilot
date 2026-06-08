import Nav from '@/components/nav';
import AuthGuard from '@/components/auth-guard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Nav />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-6 page-enter">
            {children}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
