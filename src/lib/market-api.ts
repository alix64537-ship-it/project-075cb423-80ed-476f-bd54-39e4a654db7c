import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listListings, LISTING_IMAGES_BUCKET } from "./listings.functions";
import type { Listing, Mode } from "./listings";

export const listingsQueryOptions = () =>
  queryOptions({
    queryKey: ["listings"],
    queryFn: () => listListings(),
    staleTime: 30_000,
  });

export const favoritesQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["favorites", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("favorites").select("listing_id");
      if (error) throw error;
      return new Set(data.map((r) => r.listing_id));
    },
  });

export async function setFavorite(userId: string, listingId: string, value: boolean) {
  const q = value
    ? supabase.from("favorites").insert({ user_id: userId, listing_id: listingId })
    : supabase.from("favorites").delete().eq("user_id", userId).eq("listing_id", listingId);
  const { error } = await q;
  if (error) throw error;
}

export type ListingDraft = {
  mode: Mode;
  title: string;
  category: string;
  city: string;
  price: number | null;
  priceMax: number | null;
  priceSuffix: string | null;
  company: string | null;
  description: string;
  phone: string;
  telegram: string | null;
  sellerName: string;
  sellerType: string;
  sellerSince: string;
};

export async function createListing(userId: string, draft: ListingDraft, files: File[]) {
  const paths: string[] = [];
  for (const file of files) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(LISTING_IMAGES_BUCKET).upload(path, file, {
      contentType: file.type || "image/jpeg",
    });
    if (error) {
      if (paths.length) await supabase.storage.from(LISTING_IMAGES_BUCKET).remove(paths);
      throw error;
    }
    paths.push(path);
  }

  const { data, error } = await supabase
    .from("listings")
    .insert({
      user_id: userId,
      mode: draft.mode,
      title: draft.title,
      category: draft.category,
      city: draft.city,
      price: draft.price,
      price_max: draft.priceMax,
      price_suffix: draft.priceSuffix,
      company: draft.company,
      description: draft.description,
      images: paths,
      phone: draft.phone,
      telegram: draft.telegram,
      seller_name: draft.sellerName,
      seller_type: draft.sellerType,
      seller_since: draft.sellerSince,
    })
    .select("id")
    .single();
  if (error) {
    if (paths.length) await supabase.storage.from(LISTING_IMAGES_BUCKET).remove(paths);
    throw error;
  }
  return data.id;
}

export async function deleteListing(listing: Listing) {
  const { error } = await supabase.from("listings").delete().eq("id", listing.id);
  if (error) throw error;
  const own = (listing.imagePaths ?? []).filter((p) => !p.startsWith("demo/"));
  if (own.length) await supabase.storage.from(LISTING_IMAGES_BUCKET).remove(own);
}
