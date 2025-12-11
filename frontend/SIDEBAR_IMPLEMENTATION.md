# Sidebar Implementation Guide

## Tech Stack
- **Next.js** 15.5.5 (App Router)
- **React** 19.1.0
- **TypeScript** 5.9.3
- **Tailwind CSS** 4.1.17
- **Radix UI** (sidebar primitives)
- **Lucide React** (icons)
- **Clerk** (authentication)

## File Structure

```
frontend/src/
├── components/
│   ├── app-sidebar.tsx          # Main sidebar component (menu items, header, footer)
│   ├── conditional-layout.tsx   # Wraps pages with SidebarProvider
│   ├── sidebar/
│   │   ├── index.ts             # Exports SidebarSection
│   │   └── sidebar-section.tsx  # Custom section component (currently unused)
│   └── ui/
│       └── sidebar.tsx          # Base sidebar UI primitives (shadcn/ui)
└── app/
    └── layout.tsx               # Root layout with ConditionalLayout
```

## Current Implementation

### `app-sidebar.tsx`
- Defines menu items in `items` array (lines 27-43)
- Uses `SidebarGroup` with label "Application" (line 89)
- Maps items to `SidebarMenuButton` components
- Active state determined by `pathname === item.url`
- Footer contains Settings and User profile

### `conditional-layout.tsx`
- Conditionally renders sidebar based on route and auth state
- Wraps authenticated pages with `SidebarProvider` and `SidebarInset`
- Excludes login page from sidebar

## Adding a New Sidebar Section

### Option 1: Add to Existing "Application" Group
1. **Add item to `items` array** in `app-sidebar.tsx`:
```typescript
const items = [
  // ... existing items
  {
    title: "New Section",
    url: "/new-section",
    icon: YourIcon, // Import from lucide-react
  },
]
```

2. **Create the page route** at `frontend/src/app/new-section/page.tsx`

### Option 2: Create a New Sidebar Group
1. **Add a new `SidebarGroup`** in `app-sidebar.tsx` after the existing one:
```typescript
<SidebarGroup>
  <SidebarGroupLabel>New Group</SidebarGroupLabel>
  <SidebarGroupContent>
    <SidebarMenu>
      {/* menu items */}
    </SidebarMenu>
  </SidebarGroupContent>
</SidebarGroup>
```

2. **Create corresponding page routes** for each menu item

## Key Components

- `SidebarProvider`: Context provider for sidebar state
- `Sidebar`: Main container (supports collapsible="icon")
- `SidebarHeader`: Logo and trigger
- `SidebarContent`: Scrollable content area
- `SidebarGroup`: Grouped menu sections
- `SidebarMenuButton`: Individual menu items with active state
- `SidebarFooter`: User profile and settings
- `SidebarInset`: Main content wrapper (used in conditional-layout)

## Notes

- Sidebar state persists via cookies (`sidebar_state`)
- Mobile: Renders as Sheet overlay
- Desktop: Fixed position with collapse/expand
- Active state automatically highlights current route
- Icons from `lucide-react` library



