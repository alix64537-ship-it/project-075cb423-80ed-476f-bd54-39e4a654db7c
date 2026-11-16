import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Heart, Plus, SearchX, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Header, Logo } from "@/components/market/Header";
import { CategoryPills, FilterBar, SearchHero } from "@/components/market/SearchFilters";
import { ListingCard } from "@/components/market/ListingCard";
import { ListingDetail } from "@/components/market/ListingDetail";
import { PostAdDialog } from "@/components/market/PostAdDialog";
import { AuthDialog } from "@/components/market/AuthDialog";
import { ALL_CITIES, filterListings, type Mode, type SortKey } from "@/lib/listings";
import {
  createListing,
  deleteListing,
  favoritesQueryOptions,
  listingsQueryOptions,
  setFavorite,
  type ListingDraft,
} from "@/lib/market-api";
import { useAuth } from "@/hooks/use-auth";

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
  loader: ({ context }) => context.queryClient.ensureQueryData(listingsQueryOptions()),
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
  const queryClient = useQueryClient();
  const { user, profile, displayName, signOut } = useAuth();
  const { data: listings } = useSuspenseQuery(listingsQueryOptions());
  const { data: favoritesData } = useQuery(favoritesQueryOptions(user?.id));
  const favorites = useMemo(() => (user ? favoritesData ?? new Set<string>() : new Set<string>()), [user, favoritesData]);

  const [mode, setMode] = useState<Mode>("goods");
  const [city, setCity] = useState(ALL_CITIES);
  const [category, setCategory] = useState<string | null>(null);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [sort, setSort] = useState<SortKey>("new");
  const [view, setView] = useState<"all" | "favorites" | "mine">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [postOpen, setPostOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState<string | null>(null);

  const showFavorites = view === "favorites";
  const showMine = view === "mine";

  const requireAuth = (reason: string) => {
    setAuthReason(reason);
    setAuthOpen(true);
  };

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
        ownerId: showMine ? user?.id : null,
      }),
    [listings, mode, city, category, query, priceFrom, priceTo, sort, showFavorites, showMine, favorites, user],
  );

  const opened = listings.find((l) => l.id === openId) ?? null;

  const changeMode = (m: Mode) => {
    setMode(m);
    setCategory(null);
    setPriceFrom("");
    setPriceTo("");
  };

  const favoriteMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) => setFavorite(user!.id, id, value),
    onMutate: async ({ id, value }) => {
      const key = favoritesQueryOptions(user?.id).queryKey;
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<Set<string>>(key);
      const next = new Set(prev ?? []);
      if (value) next.add(id);
      else next.delete(id);
      queryClient.setQueryData(key, next);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      queryClient.setQueryData(favoritesQueryOptions(user?.id).queryKey, ctx?.prev);
      toast.error("Не удалось обновить избранное");
    },
    onSuccess: (_d, { value }) => {
      if (value) toast.success("Добавлено в избранное");
      else toast("Удалено из избранного");
    },
  });

  const toggleFavorite = (id: string) => {
    if (!user) return requireAuth("Войдите, чтобы сохранять объявления в избранное.");
    favoriteMutation.mutate({ id, value: !favorites.has(id) });
  };

  const openPost = () => {
    if (!user) return requireAuth("Войдите, чтобы подать объявление.");
    setPostOpen(true);
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

  const handlePublish = async (draft: ListingDraft, files: File[]) => {
    if (!user) return requireAuth("Войдите, чтобы подать объявление.");
    try {
      const id = await createListing(user.id, draft, files);
      await queryClient.invalidateQueries({ queryKey: ["listings"] });
      setPostOpen(false);
      setMode(draft.mode);
      setCategory(null);
      setView("all");
      setSort("new");
      if (city !== ALL_CITIES && city !== draft.city) setCity(ALL_CITIES);
      toast.success("Объявление опубликовано", {
        description: draft.title,
        action: { label: "Открыть", onClick: () => setOpenId(id) },
      });
    } catch {
      toast.error("Не удалось опубликовать объявление. Попробуйте еще раз.");
    }
  };

  const handleDelete = async () => {
    if (!opened) return;
    try {
      await deleteListing(opened);
      setOpenId(null);
      await queryClient.invalidateQueries({ queryKey: ["listings"] });
      toast("Объявление удалено");
    } catch {
      toast.error("Не удалось удалить объявление");
    }
  };

  const sinceYear = user?.created_at ? new Date(user.created_at).getFullYear() : new Date().getFullYear();
  const postUser = user ? { name: displayName, phone: profile?.phone ?? null, since: `на Сауда с ${sinceYear} года` } : null;

  return (
    <div className="min-h-screen bg-background">
      <Header
        mode={mode}
        onModeChange={changeMode}
        city={city}
        onCityChange={setCity}
        onPost={openPost}
        user={user ? { name: displayName } : null}
        onLogin={() => requireAuth("")}
        onLogout={async () => {
          await signOut();
          setView("all");
          toast("Вы вышли из профиля");
        }}
        favoritesCount={favorites.size}
        onShowFavorites={() => setView("favorites")}
        onShowMine={() => setView("mine")}
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
              {showFavorites ? "Избранное" : showMine ? "Мои объявления" : category ?? (mode === "goods" ? "Свежие объявления" : "Свежие вакансии")}
              <span className="ml-2 align-middle font-sans text-sm font-normal text-muted-foreground">
                {pluralListings(visible.length, mode)}
                {city !== ALL_CITIES && ` · ${city}`}
              </span>
            </h2>
            {view !== "all" ? (
              <Button variant="soft" size="sm" onClick={() => setView("all")} className="rounded-full">
                <X /> Показать все
              </Button>
            ) : (
              favorites.size > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setView("favorites")} className="rounded-full">
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
                {showFavorites ? "В избранном пока пусто" : showMine ? "Здесь пока нет ваших объявлений" : "Ничего не найдено"}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {showFavorites
                  ? "Нажимайте на сердечко в карточке, чтобы сохранить понравившиеся объявления."
                  : showMine
                    ? "Подайте объявление — оно появится здесь. Проверьте и другую вкладку раздела."
                    : "Попробуйте изменить запрос, город или диапазон цены."}
              </p>
              {showMine && (
                <Button onClick={openPost} className="mt-5 rounded-xl">
                  <Plus /> Подать объявление
                </Button>
              )}
              {view === "all" && canReset && (
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
        <Button onClick={openPost} className="h-12 w-full rounded-xl text-base shadow-cta">
          <Plus /> Подать объявление
        </Button>
      </div>

      <ListingDetail
        listing={opened}
        onOpenChange={(o) => !o && setOpenId(null)}
        favorite={opened ? favorites.has(opened.id) : false}
        onToggleFavorite={() => opened && toggleFavorite(opened.id)}
        canDelete={!!user && !!opened?.userId && opened.userId === user.id}
        onDelete={handleDelete}
      />
      <PostAdDialog
        open={postOpen}
        onOpenChange={setPostOpen}
        defaultMode={mode}
        defaultCity={city}
        user={postUser}
        onSubmit={handlePublish}
      />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} reason={authReason} />
    </div>
  );
}
