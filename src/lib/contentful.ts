import { createClient, type EntrySkeletonType, type Entry } from 'contentful';

const client = createClient({
  space: import.meta.env.CONTENTFUL_SPACE_ID,
  accessToken: import.meta.env.CONTENTFUL_ACCESS_TOKEN,
});

const LOCALE = 'nl-NL';

// ─── Content-type interfaces ───────────────────────────────
// Fields are returned as plain values when requesting a single locale.

export interface BlogPostFields {
  title: string;
  slug: string;
  body: string; // Markdown string
  publishDate: string;
  heroImage?: any;
  description?: string;
  category?: Entry<BlogCategorySkeleton>[];
  type?: Entry<BlogTypeSkeleton>[];
  author?: Entry<PersonSkeleton>;
}

export interface BlogCategoryFields {
  name: string;
  slug: string;
}

export interface BlogTypeFields {
  name: string;
  slug: string;
}

export interface PersonFields {
  name: string;
  bio?: string;
  image?: any;
}

export interface SiteInfoFields {
  siteName: string;
  heroText?: string;
  longerText?: string;
  heroImage?: any;
}

export interface StoryEntryFields {
  title: string;
  body: string;
  date: string;
  image?: any;
}

export interface ProductFields {
  name: string;
  slug: string;
  description?: string;
  price?: number;
  image?: any;
  stripePaymentLink?: string;
}

export interface LegalInformationFields {
  title: string;
  content: string;
}

export interface DonationReactionFields {
  name: string;
  message: string;
  amount?: number;
}

export interface DownloadFields {
  title: string;
  slug: string;
  description?: string;
  file: any;
}

// NOTE: The AffiliateLink content type does not yet exist in Contentful.
// It needs to be created in the Contentful UI before this interface can be queried.
export interface AffiliateLinkFields {
  name: string;
  url: string;
  description?: string;
}

// ─── Entry skeletons (for typed queries) ───────────────────
export interface BlogPostSkeleton extends EntrySkeletonType {
  contentTypeId: 'blogPost';
  fields: BlogPostFields;
}

export interface BlogCategorySkeleton extends EntrySkeletonType {
  contentTypeId: 'blogCategory';
  fields: BlogCategoryFields;
}

export interface BlogTypeSkeleton extends EntrySkeletonType {
  contentTypeId: 'blogType';
  fields: BlogTypeFields;
}

export interface PersonSkeleton extends EntrySkeletonType {
  contentTypeId: 'person';
  fields: PersonFields;
}

export interface SiteInfoSkeleton extends EntrySkeletonType {
  contentTypeId: 'siteInfo';
  fields: SiteInfoFields;
}

export interface StoryEntrySkeleton extends EntrySkeletonType {
  contentTypeId: 'storyOfMakersInc';
  fields: StoryEntryFields;
}

export interface ProductSkeleton extends EntrySkeletonType {
  contentTypeId: 'product';
  fields: ProductFields;
}

export interface LegalInformationSkeleton extends EntrySkeletonType {
  contentTypeId: 'legalInformation';
  fields: LegalInformationFields;
}

export interface DonationReactionSkeleton extends EntrySkeletonType {
  contentTypeId: 'donationReaction';
  fields: DonationReactionFields;
}

export interface DownloadSkeleton extends EntrySkeletonType {
  contentTypeId: 'download';
  fields: DownloadFields;
}

export interface AffiliateLinkSkeleton extends EntrySkeletonType {
  contentTypeId: 'affiliateLink';
  fields: AffiliateLinkFields;
}

// ─── Helper functions ──────────────────────────────────────

export async function getBlogPosts() {
  const entries = await client.getEntries<BlogPostSkeleton>({
    content_type: 'blogPost',
    locale: LOCALE,
    order: ['-fields.publishDate'],
    include: 2,
  } as any);
  return entries.items;
}

export async function getBlogPost(slug: string) {
  const entries = await client.getEntries<BlogPostSkeleton>({
    content_type: 'blogPost',
    locale: LOCALE,
    'fields.slug': slug,
    include: 2,
  } as any);
  return entries.items[0] ?? null;
}

export async function getBlogPostsByCategory(categoryName: string) {
  const posts = await getBlogPosts();
  return posts.filter((post) => {
    const categories = post.fields.category as any[] | undefined;
    if (!categories) return false;
    return categories.some((cat: any) => cat.fields?.name === categoryName);
  });
}

export async function getDownloads() {
  const entries = await client.getEntries<DownloadSkeleton>({
    content_type: 'download',
    locale: LOCALE,
  });
  return entries.items;
}

export async function getDownload(slug: string) {
  const entries = await client.getEntries<DownloadSkeleton>({
    content_type: 'download',
    locale: LOCALE,
    'fields.slug': slug,
  } as any);
  return entries.items[0] ?? null;
}

export async function getSiteInfo() {
  const entries = await client.getEntries<SiteInfoSkeleton>({
    content_type: 'siteInfo',
    locale: LOCALE,
  });
  return entries.items[0] ?? null;
}

export async function getProduct(slug: string) {
  const entries = await client.getEntries<ProductSkeleton>({
    content_type: 'product',
    locale: LOCALE,
    'fields.slug': slug,
  } as any);
  return entries.items[0] ?? null;
}

export async function getStoryEntries() {
  const entries = await client.getEntries<StoryEntrySkeleton>({
    content_type: 'storyOfMakersInc',
    locale: LOCALE,
    order: ['fields.date'],
  } as any);
  return entries.items;
}

export async function getLegalInformation(title: string) {
  const entries = await client.getEntries<LegalInformationSkeleton>({
    content_type: 'legalInformation',
    locale: LOCALE,
    'fields.title': title,
  } as any);
  return entries.items[0] ?? null;
}

export async function getPersonEntry() {
  const entries = await client.getEntries<PersonSkeleton>({
    content_type: 'person',
    locale: LOCALE,
  });
  return entries.items[0] ?? null;
}