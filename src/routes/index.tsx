import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Heart, Plus, SearchX, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Header, Logo } from "@/components/market/Header";
import { CategoryPills, FilterBar, SearchHero } from "@/components/market/SearchFilters";
import { ListingCard } from "@/components/market/ListingCard";
import { ListingDetail } from "@/components/market/ListingDetail";
import { PostAdDialog } from "@/components/market/PostAdDialog";
import { LoginDialog } from "@/components/market/LoginDialog";
import { ALL_CITIES, filterListings, MOCK_LISTINGS, type Listing, type Mode, type SortKey } from "@/lib/listings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Сауда — объявления, работа и подработка в Казахстане" },
      {
        name: "description",
        content: "Покупайте, продавайте и находите работу рядом: объявления и вакансии в Алматы, Астане, Караганде и Шымкенте.",
      },
      { property: "og:title", content: "Сауда — объявления, работа и подработка" },
      {
        property: "og:description",
        content: "Товары, услуги, недвижимость и вакансии по всему Казахстану. Подайте объявление бесплатно.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function pluralListings(n: number, mode: Mode) {
  const forms = mode === "goods" ? ["объявление", "объявления", "объявлений"] : ["вакансия", "вакансии", "вакансий"];
  const m10 = n % 10;
  const m100 = n % 100;
  const f = m10 === 1 && m100 !== 11 ? forms[0] : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? forms[1] : forms[2];
  return `${n} ${f}`;
}

function Index() {
  const [listings, setListings] = useState<Listing[]>(MOCK_LISTINGS);
  const [mode, setMode] = useState<Mode>("goods");
  const [city, setCity] = useState(ALL_CITIES);
  const [category, setCategory] = useState<string | null>(null);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [sort, setSort] = useState<SortKey>("new");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFavorites, setShowFavorites] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [postOpen, setPostOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; phone: string } | null>(null);

  const visible = useMemo(
    () =>
      filterListings(listings, {
        mode,
        city,
        category,
        query,
        priceFrom: priceFrom ? Number(priceFrom) : null,
        priceTo: priceTo ? Number(priceTo) : null,
        sort,
        onlyIds: showFavorites ? favorites : null,
      }),
    [listings, mode, city, category, query, priceFrom, priceTo, sort, showFavorites, favorites],
  );

  const opened = listings.find((l) => l.id === openId) ?? null;

  const changeMode = (m: Mode) => {
    setMode(m);
    setCategory(null);
    setPriceFrom("");
    setPriceTo("");
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast("Удалено из избранного");
      } else {
        next.add(id);
        toast.success("Добавлено в избранное");
      }
      return next;
    });
  };

  const resetFilters = () => {
    setCategory(null);
    setPriceFrom("");
    setPriceTo("");
    setSort("new");
    setQuery("");
    setQueryInput("");
  };
  const canReset = !!(category || priceFrom || priceTo || sort !== "new" || query);

  const handlePublish = (l: Listing) => {
    setListings((prev) => [l, ...prev]);
    setPostOpen(false);
    setMode(l.mode);
    setCategory(null);
    setShowFavorites(false);
    setSort("new");
    if (city !== ALL_CITIES && city !== l.city) setCity(ALL_CITIES);
    toast.success("Объявление опубликовано", {
      description: l.title,
      action: { label: "Открыть", onClick: () => setOpenId(l.id) },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        mode={mode}
        onModeChange={changeMode}
        city={city}
        onCityChange={setCity}
        onPost={() => setPostOpen(true)}
        user={user}
        onLogin={() => setLoginOpen(true)}
        onLogout={() => {
          setUser(null);
          setShowFavorites(false);
          toast("Вы вышли из профиля");
        }}
        favoritesCount={favorites.size}
        onShowFavorites={() => setShowFavorites(true)}
      />

      <main>
        <SearchHero mode={mode} query={queryInput} onQueryChange={setQueryInput} onSubmit={() => setQuery(queryInput)} />

        <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 pb-28 sm:py-8 md:pb-12">
          <CategoryPills mode={mode} value={category} onChange={setCategory} />
          <FilterBar
            mode={mode}
            priceFrom={priceFrom}
            priceTo={priceTo}
            onPriceFrom={setPriceFrom}
            onPriceTo={setPriceTo}
            sort={sort}
            onSort={setSort}
            onReset={resetFilters}
            canReset={canReset}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold sm:text-xl">
              {showFavorites ? "Избранное" : category ?? (mode === "goods" ? "Свежие объявления" : "Свежие вакансии")}
              <span className="ml-2 align-middle font-sans text-sm font-normal text-muted-foreground">
                {pluralListings(visible.length, mode)}
                {city !== ALL_CITIES && ` · ${city}`}
              </span>
            </h2>
            {showFavorites ? (
              <Button variant="soft" size="sm" onClick={() => setShowFavorites(false)} className="rounded-full">
                <X /> Показать все
              </Button>
            ) : (
              favorites.size > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setShowFavorites(true)} className="rounded-full">
                  <Heart className="fill-favorite text-favorite" /> Избранное · {favorites.size}
                </Button>
              )
            )}
          </div>

          {visible.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  favorite={favorites.has(l.id)}
                  onToggleFavorite={() => toggleFavorite(l.id)}
                  onOpen={() => setOpenId(l.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-accent text-accent-foreground">
                {showFavorites ? <Heart className="size-6" /> : <SearchX className="size-6" />}
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">
                {showFavorites ? "В избранном пока пусто" : "Ничего не найдено"}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {showFavorites
                  ? "Нажимайте на сердечко в карточке, чтобы сохранить понравившиеся объявления."
                  : "Попробуйте изменить запрос, город или диапазон цены."}
              </p>
              {!showFavorites && canReset && (
                <Button variant="outline" onClick={resetFilters} className="mt-5 rounded-xl">
                  Сбросить фильтры
                </Button>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 pb-28 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:pb-6">
          <Logo />
          <p>© 2026 Сауда. Объявления и работа по всему Казахстану.</p>
        </div>
      </footer>

      {/* Mobile post button */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-background via-background/90 to-transparent px-4 pb-4 pt-6 md:hidden">
        <Button onClick={() => setPostOpen(true)} className="h-12 w-full rounded-xl text-base shadow-cta">
          <Plus /> Подать объявление
        </Button>
      </div>

      <ListingDetail
        listing={opened}
        onOpenChange={(o) => !o && setOpenId(null)}
        favorite={opened ? favorites.has(opened.id) : false}
        onToggleFavorite={() => opened && toggleFavorite(opened.id)}
      />
      <PostAdDialog
        open={postOpen}
        onOpenChange={setPostOpen}
        defaultMode={mode}
        defaultCity={city}
        user={user}
        onSubmit={handlePublish}
      />
      <LoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onLogin={(u) => {
          setUser(u);
          toast.success(`Добро пожаловать, ${u.name}!`);
        }}
      />
    </div>
  );
}
