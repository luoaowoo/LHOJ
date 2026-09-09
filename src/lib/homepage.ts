import { ApiError } from './errors';
import { postHydroForm, scrapeAdminForms, scrapeDomainBulletin } from './scrape';

export interface CarouselSlide {
  id: string;
  image: string;
  link: string;
  title: string;
}

export interface HomepageConfig {
  announcement: string;
  slides: CarouselSlide[];
}

// The carousel config shares Hydro's domain bulletin with the announcement
// text. It lives inside an HTML comment so Hydro's own homepage, which renders
// the bulletin as markdown, shows the announcement and nothing else.
const marker = 'lhoj:carousel';
const blockPattern = /\n*<!--\s*lhoj:carousel\s*([\s\S]*?)-->[ \t]*\n?/;

function normalizeSlide(value: unknown, index: number): CarouselSlide[] {
  if (typeof value !== 'object' || value === null) return [];
  const record = value as Record<string, unknown>;
  const image = typeof record.image === 'string' ? record.image.trim() : '';
  if (!image) return [];
  return [{
    id: typeof record.id === 'string' && record.id ? record.id : `slide-${index}`,
    image,
    link: typeof record.link === 'string' ? record.link.trim() : '',
    title: typeof record.title === 'string' ? record.title.trim() : '',
  }];
}

export function parseBulletin(raw: string): HomepageConfig {
  const match = blockPattern.exec(raw);
  if (!match) return { announcement: raw.trim(), slides: [] };
  const announcement = `${raw.slice(0, match.index)}${raw.slice(match.index + match[0].length)}`.trim();
  let slides: CarouselSlide[] = [];
  try {
    const parsed: unknown = JSON.parse(match[1].trim());
    // A corrupt config must never take the announcement text down with it.
    if (Array.isArray(parsed)) slides = parsed.flatMap(normalizeSlide);
  } catch {
    slides = [];
  }
  return { announcement, slides };
}

export function serializeBulletin(announcement: string, slides: CarouselSlide[]): string {
  const body = announcement.trim();
  if (!slides.length) return body;
  const payload = JSON.stringify(slides.map(({ id, image, link, title }) => ({ id, image, link, title })));
  return `${body ? `${body}\n\n` : ''}<!-- ${marker}\n${payload}\n-->\n`;
}

export async function fetchHomepageConfig(): Promise<HomepageConfig> {
  return parseBulletin(await scrapeDomainBulletin());
}

export async function saveCarouselSlides(slides: CarouselSlide[]): Promise<void> {
  // Read-modify-write: /domain/edit posts the whole form, so every scraped
  // field (including hidden ones) has to go back untouched or Hydro will blank
  // the domain name, avatar and share settings.
  const forms = await scrapeAdminForms('/domain/edit');
  const form = forms.find((item) => item.fields.some((field) => field.name === 'bulletin'));
  if (!form) throw new ApiError('未能在域资料页找到公告字段，无法保存轮播图配置。');

  const fields: Record<string, string> = {};
  for (const field of form.fields) {
    if (field.type === 'checkbox' || field.type === 'radio') {
      if (field.checked) fields[field.name] = field.value || 'on';
      continue;
    }
    fields[field.name] = field.value;
  }
  const current = form.fields.find((field) => field.name === 'bulletin')?.value ?? '';
  fields.bulletin = serializeBulletin(parseBulletin(current).announcement, slides);
  await postHydroForm(form.action, fields);
}
