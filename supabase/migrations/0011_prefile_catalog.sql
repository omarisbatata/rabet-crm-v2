-- Prefile — catalog-driven Audit / Price List PDF generator. No AI dependency
-- anywhere in this feature; the catalog is the only source of document
-- content, edited by hand via the owner-only Settings → Prefile Catalog page.

create type public.prefile_doc_type as enum ('audit', 'price_list');
create type public.prefile_category as enum ('issue', 'recommendation', 'tier');
create type public.prefile_lane     as enum ('web', 'social', 'video');

create table public.prefile_catalog (
  id         uuid primary key default gen_random_uuid(),
  doc_type   public.prefile_doc_type not null,
  category   public.prefile_category not null,
  lane       public.prefile_lane not null,
  title      text not null,
  body       text not null default '',
  price      text,              -- tier rows only; null for issue/recommendation
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- issue/recommendation only ever apply to an audit; tier only to a price list.
  constraint prefile_catalog_category_matches_doc_type check (
    (doc_type = 'audit'      and category in ('issue', 'recommendation'))
    or (doc_type = 'price_list' and category = 'tier')
  )
);

create index prefile_catalog_lookup_idx on public.prefile_catalog (doc_type, lane, category, sort_order);

alter table public.prefile_catalog enable row level security;

-- Whole team (minus viewer/accountant/it) reads the catalog to build a
-- document; only the owner maintains it, same split as it_assets.
create policy "prefile_catalog_select_owner_teammate"
  on public.prefile_catalog for select
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'teammate')));

create policy "prefile_catalog_insert_owner"
  on public.prefile_catalog for insert
  to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'owner'));

create policy "prefile_catalog_update_owner"
  on public.prefile_catalog for update
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'owner'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'owner'));

create policy "prefile_catalog_delete_owner"
  on public.prefile_catalog for delete
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'owner'));

revoke all on public.prefile_catalog from anon;

create function public.touch_prefile_catalog()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger prefile_catalog_touch
  before update on public.prefile_catalog
  for each row execute function public.touch_prefile_catalog();


-- ═══════════════════════════════════════════════════════════════════
-- Seed data
-- ═══════════════════════════════════════════════════════════════════

-- ── Audit issues ─────────────────────────────────────────────────────────

insert into public.prefile_catalog (doc_type, category, lane, title, body, sort_order) values
-- Web (verbatim from the Haseeb Coffee reference audit)
('audit', 'issue', 'web', 'Product pages don''t actually exist', 'Clicking any product image opens a raw image file, not a product page. No name, origin, specs, size, or price anywhere. Biggest single gap.', 1),
('audit', 'issue', 'web', 'Broken, inconsistent URL structure', 'Different pages link to the same content with different URL schemes. Worth checking how many actually 404.', 2),
('audit', 'issue', 'web', 'Dead navigation item', 'A menu item exists but links nowhere.', 3),
('audit', 'issue', 'web', 'English copy needs a rewrite', 'Several lines read as raw machine translation, undercutting international positioning.', 4),
('audit', 'issue', 'web', 'No SEO fundamentals', 'No meta description, no real keywords, weak page title. Nothing for Google to index.', 5),
('audit', 'issue', 'web', 'Pre-mobile-first layout', 'Autoplay video header, static sliders, no filtering; likely runs heavy on mobile.', 6),
-- Social
('audit', 'issue', 'social', 'Inconsistent posting schedule', 'Gaps of two-plus weeks between posts break algorithmic momentum and make the account look inactive to new visitors.', 1),
('audit', 'issue', 'social', 'No clear bio call-to-action', 'The bio doesn''t tell a visitor what to do next — no link, no contact prompt, no reason to keep scrolling.', 2),
('audit', 'issue', 'social', 'Low-effort captions', 'Captions are one-line product tags with no hook, no story, nothing that earns a comment or share.', 3),
('audit', 'issue', 'social', 'No highlights/story structure', 'Story highlights aren''t organized, so anything useful (menu, hours, reviews) disappears after 24 hours.', 4),
('audit', 'issue', 'social', 'Zero community management', 'Comments and DMs go unanswered for days, which hurts reach as much as it hurts trust.', 5),
-- Video
('audit', 'issue', 'video', 'No consistent visual branding', 'Every video looks like it was made by someone different — no consistent intro, colors, or caption style.', 1),
('audit', 'issue', 'video', 'Poor or inconsistent audio', 'Background noise and inconsistent levels make videos hard to watch past the first few seconds.', 2),
('audit', 'issue', 'video', 'No hook in the first 3 seconds', 'Videos open slow, the single biggest reason short-form content gets scrolled past.', 3),
('audit', 'issue', 'video', 'No call-to-action', 'Videos end without telling the viewer what to do next.', 4),
('audit', 'issue', 'video', 'Footage shot but never used', 'Raw footage sits unedited for weeks, so it''s no longer timely by the time it''s posted.', 5);

-- ── Audit recommendations ────────────────────────────────────────────────

insert into public.prefile_catalog (doc_type, category, lane, title, body, sort_order) values
-- Web (generalized from the Haseeb reference audit)
('audit', 'recommendation', 'web', 'Real product pages', 'Origin/specs, use case, a clear next step (order, inquire, become a distributor) — not just an image.', 1),
('audit', 'recommendation', 'web', 'An actual lead-capture form', 'A short inquiry form beats a bare phone number and email buried in the footer.', 2),
('audit', 'recommendation', 'web', 'Trust signals', 'Certifications, years in operation, notable clients or export countries — whatever''s true, made visible instead of implied.', 3),
('audit', 'recommendation', 'web', 'A working exhibitions/portfolio page', 'If there''s a nav slot for it, it should actually hold recent proof, not a dead link.', 4),
('audit', 'recommendation', 'web', 'Consistent Arabic/English structure', 'One real language toggle, not two separately-maintained, inconsistently-named URLs.', 5),
-- Social
('audit', 'recommendation', 'social', 'Content calendar with a fixed cadence', 'A simple weekly schedule beats sporadic bursts — consistency is what the algorithm and the audience both reward.', 1),
('audit', 'recommendation', 'social', 'A real bio CTA', 'Tell a visitor exactly what to do next: message, call, or tap a link — not just a handle and a hashtag.', 2),
('audit', 'recommendation', 'social', 'Organized story highlights', 'Menu, hours, reviews, and FAQs live in highlights so they don''t disappear after 24 hours.', 3),
('audit', 'recommendation', 'social', 'Basic community management routine', 'Comments and DMs answered within a day, not left for a week — it''s free trust-building most accounts skip.', 4),
-- Video
('audit', 'recommendation', 'video', 'A repeatable visual template', 'Same intro, colors, and caption style every time, so the account is recognizable at a glance.', 1),
('audit', 'recommendation', 'video', 'A 3-second hook rule', 'Open on the payoff or the problem, not a slow wind-up — that''s the difference between a watch and a scroll-past.', 2),
('audit', 'recommendation', 'video', 'One clear CTA per video', 'Every video ends by telling the viewer exactly what to do next.', 3),
('audit', 'recommendation', 'video', 'A shoot-to-post pipeline', 'Footage edited and posted within a week of filming, so nothing goes stale in a folder.', 4);

-- ── Price list tiers ──────────────────────────────────────────────────────
-- Price ranges are from the delivered rabet-price-list.pdf; the body copy
-- below is a placeholder rewrite (that PDF/build script wasn't available
-- when this catalog was seeded) — review and edit via Settings → Prefile
-- Catalog before this goes out to a real client.

insert into public.prefile_catalog (doc_type, category, lane, title, body, price, sort_order) values
-- Web
('price_list', 'tier', 'web', 'Starter Site', 'A clean single-page or few-page site: what you do, how to reach you, built to launch fast.', '$150–250', 1),
('price_list', 'tier', 'web', 'Business Website', 'Multi-page site with real content structure — services, about, contact — built to represent an established business.', '$400–700', 2),
('price_list', 'tier', 'web', 'E-Commerce / Web App', 'Online store or custom web app with real functionality — products, checkout, or whatever the business logic requires.', '$900–2,000+', 3),
('price_list', 'tier', 'web', 'Website Audit', 'A no-obligation review of what''s working, what''s costing you inquiries, and where to start.', 'Free', 4),
('price_list', 'tier', 'web', 'Care & Maintenance', 'Ongoing updates, backups, and small fixes so the site keeps working without you thinking about it.', '$60–120/mo', 5),
-- Social
('price_list', 'tier', 'social', 'Starter', 'A light, consistent presence: a handful of posts a month, on-brand, on schedule.', '$200–300/mo', 1),
('price_list', 'tier', 'social', 'Growth', 'Regular posting plus stories and basic community management — built to actually grow the account.', '$400–600/mo', 2),
('price_list', 'tier', 'social', 'Full Management', 'End-to-end social presence: content, scheduling, community management, and monthly reporting.', '$700–1,100/mo', 3),
-- Video
('price_list', 'tier', 'video', 'Reel Edit', 'Send raw footage, get back a polished, platform-ready edit.', '$35–70/video', 1),
('price_list', 'tier', 'video', 'Monthly Reel Package', 'A set number of edited reels per month, on a consistent cadence.', '$250–450/mo', 2),
('price_list', 'tier', 'video', 'On-Site Shoot', 'We come film — product, team, or space — half a day, ready to edit.', '$300–500/half-day', 3),
('price_list', 'tier', 'video', 'Full Production', 'Concept through final edit — planning, filming, and post — for one complete piece.', '$800–1,500', 4);
