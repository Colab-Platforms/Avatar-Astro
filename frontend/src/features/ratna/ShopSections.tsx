import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ratnaApi } from "./api";
import type { MatchedProduct } from "./types";

const ProductCard = ({ p }: { p: MatchedProduct }) => (
  <li className="flex flex-col overflow-hidden rounded-xl border border-[#d4a64a]/25 bg-[#081426]/70">
    <Link to={p.url} className="ratna-link block" aria-label={`View ${p.name}`}>
      {p.image ? (
        <img src={p.image} alt={p.name} loading="lazy" className="h-44 w-full object-cover" />
      ) : (
        <div className="flex h-44 items-center justify-center bg-[#0c1c38] text-slate-500">No image</div>
      )}
    </Link>
    <div className="flex flex-1 flex-col gap-1 p-3">
      <p className="text-sm text-slate-400">{p.categoryName}</p>
      <Link to={p.url} className="ratna-link text-lg font-semibold text-white hover:text-[#f0d58a]">
        {p.name}
      </Link>
      <p className="text-lg text-[#f0d58a]">
        ₹{p.price.toLocaleString("en-IN")}
        {p.originalPrice ? (
          <span className="ml-2 text-base text-slate-500 line-through">₹{p.originalPrice.toLocaleString("en-IN")}</span>
        ) : null}
      </p>
      {p.reason && <p className="text-sm text-slate-300">{p.reason}</p>}
      <p className="text-sm text-slate-400">Listed in the My Bhagya catalogue</p>
      <Link to={p.url} className="ratna-btn-ghost mt-auto inline-flex items-center justify-center text-base">
        View product
      </Link>
    </div>
  </li>
);

const Grid = ({ items }: { items: MatchedProduct[] }) => (
  <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {items.map((p) => (
      <ProductCard key={p.id} p={p} />
    ))}
  </ul>
);

const ShopSections = ({ stoneKey, stoneName }: { stoneKey: string; stoneName: string }) => {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["ratna-products", stoneKey],
    queryFn: () => ratnaApi.products(stoneKey),
    retry: 1,
  });

  return (
    <section className="ratna-card p-5 sm:p-7" aria-labelledby="ratna-shop-h">
      <h2 id="ratna-shop-h" className="font-astra text-2xl text-[#f0d58a] sm:text-3xl">
        From the My Bhagya Shop
      </h2>

      {isLoading && <p className="mt-4 text-slate-300" role="status">Loading shop matches…</p>}

      {isError && (
        <div role="alert" className="mt-4 rounded-lg border border-red-400/50 bg-red-950/40 p-4 text-red-200">
          <p>We could not load shop products right now. Your result above is not affected.</p>
          <button type="button" className="ratna-btn-ghost mt-3" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Retrying…" : "Try again"}
          </button>
        </div>
      )}

      {data && (
        <div className="mt-4 space-y-8">
          <div>
            <h3 className="text-xl text-white">{stoneName}</h3>
            {data.gemstones.length > 0 ? (
              <Grid items={data.gemstones} />
            ) : (
              <p className="mt-2 text-slate-300">
                No {stoneName} is currently listed in the shop. We do not substitute a different gemstone.
              </p>
            )}
          </div>

          {data.jewellery.length > 0 && (
            <div>
              <h3 className="text-xl text-white">Jewellery featuring {stoneName}</h3>
              <Grid items={data.jewellery} />
            </div>
          )}

          {data.chartLinked.length > 0 && (
            <div>
              <h3 className="text-xl text-white">Linked to your chart by convention</h3>
              <Grid items={data.chartLinked} />
            </div>
          )}

          {data.complementary.length > 0 && (
            <div>
              <h3 className="text-xl text-white">Complementary Spiritual Accessories</h3>
              <p className="mt-1 text-slate-300">
                These are general spiritual accessories and have not been individually selected from your birth chart.
              </p>
              <Grid items={data.complementary} />
            </div>
          )}
        </div>
      )}

      <p className="mt-6 text-sm text-slate-400">
        Purchasing a gemstone or spiritual accessory is optional. Shop matches reflect the My Bhagya catalogue and do
        not establish that purchasing an item will change life outcomes. Product descriptions are provided by the
        seller.
      </p>
    </section>
  );
};

export default ShopSections;
