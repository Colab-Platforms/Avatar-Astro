import { Link } from "react-router-dom";
import { usePanel } from "../api";
import { QueryView } from "../QueryView";
import { Badge, Card, Empty, fmtDate, NotConfigured, PageHeader, Stat, Table } from "../ui";

interface Manage { label: string; path: string }

function ManageLinks({ items }: { items: Manage[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((m) => (
        <Link key={m.path} to={m.path} className="rounded-lg bg-[#803003] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#803003]/90">{m.label}</Link>
      ))}
    </div>
  );
}

interface Devotion {
  channels: { id: string; slug: string; name: string; isLive: boolean; lastCheckedAt: string | null }[];
  catalog: { temples: number; pujas: number; chadhawas: number };
  youtubeConfigured: boolean;
  bookings: { configured: boolean; reason: string };
  manage: Manage[];
}

export function DevotionAdminPage() {
  const q = usePanel<Devotion>("/devotion");
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Devotion & Live" subtitle="Live Darshan channels (the same data the public page uses) and the puja / chadhawa catalogue." actions={<Link to="/avatar-live/darshan" className="text-sm text-[#803003] underline">Open public Live Darshan</Link>} />
      <QueryView q={q}>
        {(d) => (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Live now" value={`${d.channels.filter((c) => c.isLive).length} / ${d.channels.length}`} />
              <Stat label="Temples" value={d.catalog.temples} />
              <Stat label="Pujas" value={d.catalog.pujas} />
              <Stat label="Chadhawas" value={d.catalog.chadhawas} />
            </div>
            {!d.youtubeConfigured && <p role="alert" className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-900">YOUTUBE_API_KEY is not set on the server, so live status cannot update.</p>}
            <Card title="Darshan channels" description="Status is pushed from YouTube; it is not editable here.">
              {d.channels.length === 0 ? <Empty title="No channels configured" hint="Run the darshan seed to add channels." /> : (
                <Table head={["Channel", "Slug", "Status", "Last checked"]}>
                  {d.channels.map((c) => (
                    <tr key={c.id}>
                      <td className="px-3 py-2 font-medium">{c.name}</td>
                      <td className="px-3 py-2 font-mono text-xs">{c.slug}</td>
                      <td className="px-3 py-2">{c.isLive ? <Badge tone="good">Live</Badge> : <Badge>Offline</Badge>}</td>
                      <td className="px-3 py-2 text-xs">{fmtDate(c.lastCheckedAt)}</td>
                    </tr>
                  ))}
                </Table>
              )}
            </Card>
            <Card title="Manage catalogue"><ManageLinks items={d.manage} /></Card>
            <NotConfigured title="Bookings" reason={d.bookings.reason} />
          </>
        )}
      </QueryView>
    </div>
  );
}

interface ShopSummary {
  catalog: { products: number; activeProducts: number; categories: number };
  orders: { configured: boolean; reason: string };
  manage: Manage[];
}

export function ShopAdminPage() {
  const q = usePanel<ShopSummary>("/shop-summary");
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Shop & Orders" subtitle="Divine Shop catalogue. Orders are not connected." />
      <QueryView q={q}>
        {(d) => (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Products" value={d.catalog.products} hint={`${d.catalog.activeProducts} active`} />
              <Stat label="Categories" value={d.catalog.categories} />
              <Stat label="Orders" value="Not available" />
            </div>
            <Card title="Manage catalogue"><ManageLinks items={d.manage} /></Card>
            <NotConfigured title="Orders" reason={d.orders.reason} />
          </>
        )}
      </QueryView>
    </div>
  );
}

export function PaymentsAdminPage() {
  const q = usePanel<{ configured: boolean; reason: string }>("/payments");
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Payments & Plans" subtitle="Only real payment and subscription systems are shown here." />
      <QueryView q={q}>{(d) => <NotConfigured title="Payments and subscriptions" reason={d.reason} />}</QueryView>
    </div>
  );
}
