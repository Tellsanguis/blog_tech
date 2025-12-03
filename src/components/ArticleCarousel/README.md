# ArticleCarousel Component

A production-ready React carousel component for Docusaurus 3.9.2 that displays recent blog posts and documentation pages with auto-generated thumbnails.

## Features

- **Auto-generated Thumbnails**: Each article displays with a colorful thumbnail featuring:
  - Plain/solid color background (rotates through 6 distinct colors)
  - Article title prominently displayed
  - Type badge overlay (blue "BLOG" or green "DOCUMENTATION")
  - Optional date display for blog posts

- **Carousel Functionality**:
  - Smooth sliding animations between articles
  - Auto-play feature (advances every 5 seconds, pauses on user interaction)
  - Navigation arrows (previous/next)
  - Dot indicators for quick navigation
  - Responsive design (mobile-friendly)
  - Hover effects for enhanced interactivity

- **Bilingual Support**:
  - Full i18n compatibility (FR/EN)
  - Translatable badge text and UI strings
  - Locale-aware date formatting

## Architecture

### Component Files

```
src/components/ArticleCarousel/
├── index.tsx           # Main carousel component
├── styles.module.css   # CSS modules for styling
└── README.md          # This documentation
```

### Data Plugin

```
plugins/docusaurus-plugin-recent-articles/
└── index.js           # Plugin to fetch blog & docs data
```

### Integration Points

- **Homepage**: `src/pages/index.tsx` - Replaces the three-feature section
- **Config**: `docusaurus.config.ts` - Plugin registration
- **i18n**: `i18n/en/code.json` - English translations

## Usage

### Basic Usage

```tsx
import ArticleCarousel from '@site/src/components/ArticleCarousel';
import {usePluginData} from '@docusaurus/useGlobalData';

function MyPage() {
  const {articles} = usePluginData('docusaurus-plugin-recent-articles');

  return <ArticleCarousel articles={articles || []} maxVisible={6} />;
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `articles` | `Article[]` | required | Array of articles to display |
| `maxVisible` | `number` | `6` | Maximum number of articles in carousel |

### Article Type

```typescript
interface Article {
  title: string;        // Article title
  permalink: string;    // URL to the article
  type: 'blog' | 'doc'; // Article type (affects badge)
  date?: string;        // Optional publication/update date
}
```

## Plugin: docusaurus-plugin-recent-articles

### Purpose

Gathers recent blog posts and documentation pages from Docusaurus content plugins, sorts them by date, and makes them available globally via `usePluginData`.

### How It Works

1. Accesses blog posts from `docusaurus-plugin-content-blog`
2. Accesses documentation from `docusaurus-plugin-content-docs`
3. Extracts metadata (title, permalink, date, type)
4. Filters out index/category pages from docs
5. Sorts all articles by date (most recent first)
6. Makes data available globally via `setGlobalData`

### Data Structure

```javascript
{
  articles: [
    {
      title: "Article Title",
      permalink: "/blog/article-slug",
      type: "blog",
      date: "2025-12-02T00:00:00.000Z"
    },
    // ... more articles
  ]
}
```

## Customization

### Thumbnail Colors

Edit `getBackgroundColor()` in `index.tsx` to customize the color palette:

```typescript
const getBackgroundColor = (index: number): string => {
  const colors = [
    '#4A90E2', // Blue
    '#50C878', // Emerald
    '#9B59B6', // Purple
    '#E67E22', // Orange
    '#1ABC9C', // Turquoise
    '#E74C3C', // Red
  ];
  return colors[index % colors.length];
};
```

### Badge Colors

Edit `styles.module.css`:

```css
.articleBadgeBlog {
  background-color: #2563eb; /* Blue for blog */
}

.articleBadgeDoc {
  background-color: #059669; /* Dark green for documentation */
}
```

### Auto-play Interval

Edit the `useEffect` in `index.tsx`:

```typescript
const interval = setInterval(() => {
  setCurrentIndex((prev) => (prev + 1) % articles.length);
}, 5000); // Change 5000 to desired milliseconds
```

### Maximum Visible Articles

Pass a different `maxVisible` prop:

```tsx
<ArticleCarousel articles={articles} maxVisible={10} />
```

## i18n Configuration

### Translation Keys

All UI strings are translatable. Keys in `i18n/en/code.json`:

- `carousel.title` - Section title ("Recent Articles")
- `carousel.badge.blog` - Blog badge text ("BLOG")
- `carousel.badge.documentation` - Documentation badge text ("DOCUMENTATION")
- `carousel.previous` - Previous arrow aria-label
- `carousel.next` - Next arrow aria-label
- `carousel.goToSlide` - Dot indicator aria-label

### Adding New Locales

1. Add translations to your locale's `code.json` file
2. Badge text and UI elements will automatically use the translations

## Styling

### CSS Modules

The component uses CSS Modules for scoped styling. All classes are prefixed with the module scope.

### Dark Mode

The component respects Docusaurus's color mode through CSS variables:

- `--ifm-background-surface-color`
- `--ifm-heading-color`
- `--ifm-color-primary`
- `--ifm-color-emphasis-*`

### Responsive Breakpoints

- Desktop: Default styles
- Tablet (≤996px): Reduced padding, smaller thumbnails
- Mobile (≤768px): Compact layout, smaller arrows
- Small Mobile (≤480px): Further size reductions

## Performance Considerations

### No External Dependencies

The carousel is built with pure CSS and React, no external carousel libraries required. This:

- Reduces bundle size
- Improves load times
- Eliminates version conflicts
- Maintains full control over behavior

### Optimizations

- Uses CSS transforms for smooth animations (GPU-accelerated)
- Auto-play pauses when user interacts (improves UX)
- Articles are pre-sorted by plugin (no runtime sorting)
- Lazy evaluation with optional chaining

## Accessibility

### Keyboard Navigation

- Arrow buttons are keyboard-accessible
- Proper `aria-label` attributes on all interactive elements
- Focus states for navigation controls

### Screen Readers

- Semantic HTML structure
- Descriptive aria-labels
- Translatable accessibility strings

## Browser Compatibility

Tested and compatible with:

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

### Articles Not Appearing

1. Check that the plugin is registered in `docusaurus.config.ts`
2. Verify blog posts and docs exist in your content directories
3. Check browser console for plugin errors

### Styling Issues

1. Clear Docusaurus cache: `npm run clear`
2. Rebuild: `npm run build`
3. Check for CSS conflicts with custom themes

### Build Errors

1. Ensure all dependencies are installed: `npm install`
2. Verify TypeScript configuration is correct
3. Check that `usePluginData` hook receives valid data

## Future Enhancements

Potential improvements:

- Touch swipe gestures for mobile
- Configurable thumbnail aspect ratios
- Image upload support for custom thumbnails
- Animation variations (fade, slide vertical, etc.)
- Pause on hover option
- Infinite scroll mode

## License

This component is part of the TellServ Tech Blog and follows the project's MIT license.
