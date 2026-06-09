import { AppShell } from '@/components/layout/AppShell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-theme min-h-screen">
      <AppShell adminOnly>{children}</AppShell>
    </div>
  );
}
