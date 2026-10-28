import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ratnaApi } from "./api";
import type { MatchedProduct } from "./types";

const ProductCard = ({ p, index }: { p: MatchedProduct; index: number }) => (
  <li
    className="ratna-lift ratna-reveal flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#d4a64a]/25 bg-[#081426]/70"
    style={{ ["--i" as string]: Math.min(index, 5) }}
  >
    <Link to={p.url} className="ratna-link block overflow-hidden" aria-label={`View ${p.name}`}>
      {p.image ? (
        <img src={p.image} alt={p.name} loading="lazy" className="h-40 w-full object-cover sm:h-44" />
      ) : (
        <div className="flex h-40 items-center justify-center bg-[#0c1c38] text-slate-500 sm:h-44">No image</div>
      )}
    </Link>
    <div className="flex flex-1 flex-col gap-1 p-3">
      <Link to={p.url} className="ratna-link line-clamp-2 break-words text-base font-semibold text-white hover:text-[#f0d58a]">
        {p.name}
      </Link>
      <p className="text-base text-[#f0d58a]">
        ₹{p.price.toLocaleString("en-IN")}
        {p.originalPrice ? (
          <span className="ml-2 text-sm text-slate-500 line-through">₹{p.originalPrice.toLocaleString("en-IN")}</span>
        ) : null}
      </p>
      <Link to={p.url} className="ratna-btn-ghost mt-auto inline-flex items-center justify-center pt-0 text-sm">
        View Product
      </Link>
    </div>
  </li>
);

const Group = ({ title, intro, items }: { title: string; intro?: string; items: MatchedProduct[] }) => (
  <div>
    <h3 className="font-astra text-base text-white sm:text-lg">{title}</h3>
    {intro && <p className="mt-0.5 text-sm text-slate-400">{intro}</p>}
    <ul className="mt-3 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((p, i) => (
        <ProductCard key={p.id} p={p} index={i} />
      ))}
    </ul>
  </div>
);

const ShopSections = ({
  stoneKey,
  stoneName,
  planet,
}: {
  stoneKey: string;
  stoneName: string;
  planet: string;
}) => {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["ratna-products", stoneKey],
    queryFn: () => ratnaApi.products(stoneKey),
    retry: 1,
  });

  return (
    <section className="ratna-reveal space-y-5" style={{ ["--i" as string]: 5 }} aria-labelledby="ratna-shop-h">
      <h2 id="ratna-shop-h" className="font-astra text-lg text-[#f0d58a] sm:text-xl">
        From the My Bhagya Shop
      </h2>

      {isLoading && (
        <p className="text-slate-300" role="status">
          Loading shop matches…
        </p>
      )}

      {isError && (
        <div role="alert" className="rounded-xl border border-red-400/50 bg-red-950/40 p-4 text-red-200">
          <p>We could not load shop products right now. Your result above is not affected.</p>
          <button type="button" className="ratna-btn-ghost mt-3" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Retrying…" : "Try again"}
          </button>
        </div>
      )}

      {data && (
        <>
          {data.gemstones.length > 0 ? (
            <Group title="Your Matching Gemstone" items={data.gemstones} />
          ) : (
            <div>
              <h3 className="font-astra text-base text-white sm:text-lg">Your Matching Gemstone</h3>
              <p className="mt-1 text-slate-300">
                No {stoneName} is currently listed in the shop. We do not substitute a different gemstone.
              </p>
            </div>
          )}

          {data.jewellery.length > 0 && <Group title="Matching Gemstone Jewellery" items={data.jewellery} />}

          {data.chartLinked.length > 0 && (
            <Group
              title="Planet-Linked Accessories"
              intro={`Linked by convention to ${planet}, the planet of ${stoneName}; not a prescription.`}
              items={data.chartLinked}
            />
          )}

          {data.complementary.length > 0 && (
            <Group
              title="Complementary Spiritual Accessories"
              intro="General accessories, not selected from your birth details."
              items={data.complementary}
            />
          )}
        </>
      )}

      <p className="text-xs text-slate-400">
        Buying is optional. Listings come from the My Bhagya catalogue; descriptions are provided by the seller.
      </p>
    </section>
  );
};

export default ShopSections;
