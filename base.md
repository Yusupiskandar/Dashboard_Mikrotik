# BASE REFERENCE — Dashboard Admin Mikrotik

> File referensi ini berisi semua elemen, komponen, token desain, dan pola yang digunakan dalam project ini. Gunakan dokumen ini sebagai acuan agar semua pengembangan baru tetap konsisten dan selaras.

---

## 📦 Tech Stack

| Kategori | Teknologi |
|---|---|
| Framework | Next.js ^16.1.6 (App Router) |
| Language | TypeScript ^5.9.3 |
| Styling | TailwindCSS v4 (`@tailwindcss/postcss`) |
| Font | Outfit (Google Fonts via `next/font/google`) |
| Charting | ApexCharts + `react-apexcharts` |
| Calendar | FullCalendar (daygrid, timegrid, list, interaction) |
| Date Picker | Flatpickr |
| Map | `@react-jvectormap/core` + `@react-jvectormap/world` |
| Slider | Swiper ^11 |
| Drag & Drop | react-dnd + react-dnd-html5-backend |
| File Upload | react-dropzone |
| Utilities | tailwind-merge |

---

## 📂 Struktur Direktori

```
src/
├── app/
│   ├── (admin)/                  # Layout admin (sidebar + header)
│   │   ├── layout.tsx            # Admin layout wrapper
│   │   ├── page.tsx              # Dashboard utama (/)
│   │   ├── (others-pages)/
│   │   │   ├── (chart)/          # Halaman chart
│   │   │   ├── (forms)/          # Halaman form elements
│   │   │   ├── (tables)/         # Halaman basic tables
│   │   │   ├── blank/            # Blank page
│   │   │   ├── calendar/         # Kalender
│   │   │   └── profile/          # User profile
│   │   └── (ui-elements)/
│   │       ├── alerts/
│   │       ├── avatars/
│   │       ├── badge/
│   │       ├── buttons/
│   │       ├── images/
│   │       ├── modals/
│   │       └── videos/
│   └── (full-width-pages)/
│       ├── (auth)/               # Sign In, Sign Up
│       └── (error-pages)/        # 404
├── components/
│   ├── auth/                     # Komponen autentikasi
│   ├── calendar/                 # Komponen kalender
│   ├── charts/
│   │   ├── bar/                  # Bar Chart
│   │   └── line/                 # Line Chart
│   ├── common/
│   │   ├── ChartTab.tsx
│   │   ├── ComponentCard.tsx
│   │   ├── GridShape.tsx
│   │   ├── PageBreadCrumb.tsx
│   │   ├── ThemeToggleButton.tsx
│   │   └── ThemeTogglerTwo.tsx
│   ├── ecommerce/
│   │   ├── CountryMap.tsx
│   │   ├── DemographicCard.tsx
│   │   ├── EcommerceMetrics.tsx
│   │   ├── MonthlySalesChart.tsx
│   │   ├── MonthlyTarget.tsx
│   │   ├── RecentOrders.tsx
│   │   └── StatisticsChart.tsx
│   ├── form/
│   │   ├── Form.tsx
│   │   ├── Label.tsx
│   │   ├── MultiSelect.tsx
│   │   ├── Select.tsx
│   │   ├── date-picker.tsx
│   │   ├── form-elements/
│   │   ├── group-input/
│   │   ├── input/
│   │   │   ├── Checkbox.tsx
│   │   │   ├── FileInput.tsx
│   │   │   ├── InputField.tsx
│   │   │   ├── Radio.tsx
│   │   │   ├── RadioSm.tsx
│   │   │   └── TextArea.tsx
│   │   └── switch/
│   │       └── Switch.tsx
│   ├── header/
│   │   ├── NotificationDropdown.tsx
│   │   └── UserDropdown.tsx
│   ├── tables/
│   ├── ui/
│   │   ├── alert/
│   │   │   └── Alert.tsx
│   │   ├── avatar/
│   │   ├── badge/
│   │   │   └── Badge.tsx
│   │   ├── button/
│   │   │   └── Button.tsx
│   │   ├── dropdown/
│   │   ├── images/
│   │   ├── modal/
│   │   │   └── index.tsx (Modal)
│   │   ├── table/
│   │   │   └── index.tsx (Table, TableHeader, TableBody, TableRow, TableCell)
│   │   └── video/
│   ├── user-profile/
│   └── videos/
├── context/
│   ├── SidebarContext.tsx
│   └── ThemeContext.tsx
├── hooks/
│   ├── useGoBack.ts
│   └── useModal.ts
├── icons/
│   └── index.tsx (semua icon SVG)
└── layout/
    ├── AppHeader.tsx
    ├── AppSidebar.tsx
    ├── Backdrop.tsx
    └── SidebarWidget.tsx
```

---

## 🎨 Design Tokens (globals.css)

### Font
```css
--font-outfit: Outfit, sans-serif;
/* Digunakan: font-outfit (body default) */
```

### Breakpoints
| Token | Nilai |
|---|---|
| `2xsm` | 375px |
| `xsm` | 425px |
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |
| `3xl` | 2000px |

### Typography Scale
| Token | Size | Line Height |
|---|---|---|
| `text-title-2xl` | 72px | 90px |
| `text-title-xl` | 60px | 72px |
| `text-title-lg` | 48px | 60px |
| `text-title-md` | 36px | 44px |
| `text-title-sm` | 30px | 38px |
| `text-theme-xl` | 20px | 30px |
| `text-theme-sm` | 14px | 20px |
| `text-theme-xs` | 12px | 18px |

### Color Palette

#### Brand (Primary Blue)
| Token | Hex |
|---|---|
| `brand-25` | #f2f7ff |
| `brand-50` | #ecf3ff |
| `brand-100` | #dde9ff |
| `brand-200` | #c2d6ff |
| `brand-300` | #9cb9ff |
| `brand-400` | #7592ff |
| `brand-500` | **#465fff** ← warna utama |
| `brand-600` | #3641f5 |
| `brand-700` | #2a31d8 |
| `brand-800` | #252dae |
| `brand-900` | #262e89 |
| `brand-950` | #161950 |

#### Gray (Netral)
| Token | Hex |
|---|---|
| `gray-25` | #fcfcfd |
| `gray-50` | #f9fafb |
| `gray-100` | #f2f4f7 |
| `gray-200` | #e4e7ec |
| `gray-300` | #d0d5dd |
| `gray-400` | #98a2b3 |
| `gray-500` | #667085 |
| `gray-600` | #475467 |
| `gray-700` | #344054 |
| `gray-800` | #1d2939 |
| `gray-900` | #101828 |
| `gray-950` | #0c111d |
| `gray-dark` | #1a2231 ← background dark mode |

#### Status Colors
| Nama | 500 |
|---|---|
| `success-500` | #12b76a |
| `error-500` | #f04438 |
| `warning-500` | #f79009 |
| `orange-500` | #fb6514 |
| `blue-light-500` | #0ba5ec |

#### Accent
| Token | Hex |
|---|---|
| `theme-pink-500` | #ee46bc |
| `theme-purple-500` | #7a5af8 |

### Shadow Tokens
| Token | Deskripsi |
|---|---|
| `shadow-theme-xs` | Subtle, 1px |
| `shadow-theme-sm` | Default card shadow |
| `shadow-theme-md` | Medium elevation |
| `shadow-theme-lg` | Large elevation |
| `shadow-theme-xl` | Extra large |
| `shadow-focus-ring` | Focus indicator (brand-500/12) |
| `shadow-datepicker` | Khusus flatpickr |
| `shadow-slider-navigation` | Khusus swiper nav |
| `shadow-tooltip` | Tooltip shadow |

### Z-Index Tokens
| Token | Nilai |
|---|---|
| `z-1` | 1 |
| `z-9` | 9 |
| `z-99` | 99 |
| `z-999` | 999 |
| `z-9999` | 9999 |
| `z-99999` | 99999 |
| `z-999999` | 999999 |

---

## 🧩 Custom CSS Utilities

### Menu Item Utilities
```css
.menu-item           /* Base: flex, gap-3, px-3, py-2, font-medium, rounded-lg, text-theme-sm */
.menu-item-active    /* bg-brand-50, text-brand-500 / dark: bg-brand-500/12, text-brand-400 */
.menu-item-inactive  /* text-gray-700, hover:bg-gray-100 / dark variants */
.menu-item-icon
.menu-item-icon-active
.menu-item-icon-inactive
.menu-item-arrow
.menu-item-arrow-active
.menu-item-arrow-inactive
```

### Menu Dropdown Item Utilities
```css
.menu-dropdown-item           /* flex, gap-3, rounded-lg, px-3, py-2.5, text-theme-sm */
.menu-dropdown-item-active    /* bg-brand-50, text-brand-500 */
.menu-dropdown-item-inactive  /* text-gray-700, hover:bg-gray-100 */
.menu-dropdown-badge
.menu-dropdown-badge-active
.menu-dropdown-badge-inactive
```

### Scrollbar Utilities
```css
.no-scrollbar    /* Sembunyikan scrollbar */
.custom-scrollbar /* Scrollbar custom tipis (size-1.5, gray-200) */
```

---

## 🏗️ Layout Utama

### Root Layout (`src/app/layout.tsx`)
```tsx
// Provider urutan wajib:
<ThemeProvider>
  <SidebarProvider>
    {children}
  </SidebarProvider>
</ThemeProvider>
// Import wajib: globals.css, flatpickr/dist/flatpickr.css
// Font: Outfit dari next/font/google
```

### Admin Layout (`src/app/(admin)/layout.tsx`)
```tsx
// Terdiri dari: AppSidebar + Backdrop + AppHeader + children
// Main content margin dinamis sesuai state sidebar:
// - Mobile open: ml-0
// - Expanded/Hovered: lg:ml-[290px]
// - Collapsed: lg:ml-[90px]
// Page wrapper: p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6
```

### AppSidebar
- Width expanded: `w-[290px]`
- Width collapsed: `w-[90px]`
- Background: `bg-white dark:bg-gray-900`
- Border: `border-r border-gray-200 dark:border-gray-800`
- Z-index: `z-50`
- Logo: `/images/logo/logo.svg` (light), `/images/logo/logo-dark.svg` (dark), `/images/logo/logo-icon.svg` (collapsed)
- Nav sections: **Menu** dan **Others** dengan subItems accordion

### AppHeader
- Position: `sticky top-0`
- Background: `bg-white dark:bg-gray-900`
- Border: `lg:border-b border-gray-200 dark:border-gray-800`
- Z-index: `z-99999`
- Berisi: Sidebar toggle, Search bar (⌘K), ThemeToggleButton, NotificationDropdown, UserDropdown

---

## 🧩 Komponen UI

### `<Button>`
**Path:** `src/components/ui/button/Button.tsx`
```tsx
<Button
  size="sm" | "md"              // default: "md"
  variant="primary" | "outline" // default: "primary"
  startIcon={<Icon />}
  endIcon={<Icon />}
  onClick={() => {}}
  disabled={false}
  className=""
>
  Teks
</Button>
```
| Variant | Style |
|---|---|
| `primary` | `bg-brand-500 text-white hover:bg-brand-600` |
| `outline` | `bg-white ring-1 ring-gray-300 text-gray-700` |
| Size `sm` | `px-4 py-3 text-sm` |
| Size `md` | `px-5 py-3.5 text-sm` |

---

### `<Badge>`
**Path:** `src/components/ui/badge/Badge.tsx`
```tsx
<Badge
  variant="light" | "solid"                    // default: "light"
  color="primary"|"success"|"error"|"warning"|"info"|"light"|"dark"  // default: "primary"
  size="sm" | "md"                              // default: "md"
  startIcon={<Icon />}
  endIcon={<Icon />}
>
  Label
</Badge>
```
| Color | Light Style |
|---|---|
| `primary` | `bg-brand-50 text-brand-500` |
| `success` | `bg-success-50 text-success-600` |
| `error` | `bg-error-50 text-error-600` |
| `warning` | `bg-warning-50 text-warning-600` |
| `info` | `bg-blue-light-50 text-blue-light-500` |
| `light` | `bg-gray-100 text-gray-700` |
| `dark` | `bg-gray-500 text-white` |

---

### `<Alert>`
**Path:** `src/components/ui/alert/Alert.tsx`
```tsx
<Alert
  variant="success" | "error" | "warning" | "info"
  title="Judul Alert"
  message="Pesan detail"
  showLink={false}
  linkHref="#"
  linkText="Learn more"
/>
```
- Container: `rounded-xl border p-4` + warna sesuai variant
- Icon inline SVG per variant

---

### `<Modal>`
**Path:** `src/components/ui/modal/index.tsx`
```tsx
<Modal
  isOpen={boolean}
  onClose={() => {}}
  className=""
  showCloseButton={true}  // default: true
  isFullscreen={false}    // default: false
>
  {children}
</Modal>
```
- Backdrop: `bg-gray-400/50 backdrop-blur-[32px]`
- Container: `rounded-3xl bg-white dark:bg-gray-900`
- Z-index: `z-99999`
- Close button: `rounded-full bg-gray-100 dark:bg-gray-800`
- ESC key menutup modal

---

### `<ComponentCard>` (Card Wrapper)
**Path:** `src/components/common/ComponentCard.tsx`
```tsx
<ComponentCard
  title="Judul Card"
  desc="Deskripsi opsional"
  className=""
>
  {children}
</ComponentCard>
```
- Styling: `rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]`
- Header: `px-6 py-5`
- Body: `p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6`
- Title: `text-base font-medium text-gray-800 dark:text-white/90`

---

### `<PageBreadcrumb>`
**Path:** `src/components/common/PageBreadCrumb.tsx`
```tsx
<PageBreadcrumb pageTitle="Nama Halaman" />
```
- Container: `flex flex-wrap items-center justify-between gap-3 mb-6`
- Title: `text-xl font-semibold text-gray-800 dark:text-white/90`
- Breadcrumb: Home → [Halaman Saat Ini]

---

## 📋 Komponen Form

### `<Input>` (InputField)
**Path:** `src/components/form/input/InputField.tsx`
```tsx
<Input
  type="text" | "number" | "email" | "password" | "date" | "time"
  id="field-id"
  name="field-name"
  placeholder="Placeholder..."
  defaultValue=""
  onChange={(e) => {}}
  disabled={false}
  success={false}
  error={false}
  hint="Teks hint opsional"
  className=""
/>
```
- Base: `h-11 w-full rounded-lg border px-4 py-2.5 text-sm shadow-theme-xs`
- Default: `border-gray-300 focus:border-brand-300 focus:ring-brand-500/10`
- Error: `border-error-500 text-error-800`
- Success: `border-success-400 text-success-500`
- Disabled: `border-gray-300 cursor-not-allowed`

---

### `<Select>`
**Path:** `src/components/form/Select.tsx`
```tsx
<Select
  options={[{ value: "val", label: "Label" }]}
  placeholder="Pilih opsi"
  onChange={(value) => {}}
  defaultValue=""
  className=""
/>
```
- Styling: `h-11 w-full appearance-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm`

---

### `<Checkbox>`
**Path:** `src/components/form/input/Checkbox.tsx`
```tsx
<Checkbox
  label="Label checkbox"
  checked={boolean}
  id="checkbox-id"
  onChange={(checked) => {}}
  disabled={false}
  className=""
/>
```
- Checked: `bg-brand-500 border-transparent`
- Unchecked: `border-gray-300 dark:border-gray-700`

---

### `<TextArea>`
**Path:** `src/components/form/input/TextArea.tsx`
- Konsisten dengan InputField: border-gray-300, rounded-lg, focus:brand-500

---

### `<Label>`
**Path:** `src/components/form/Label.tsx`
```tsx
<Label htmlFor="input-id">Teks Label</Label>
```

---

### `<Switch>`
**Path:** `src/components/form/switch/Switch.tsx`
- Toggle ON/OFF dengan warna brand-500

---

## 📊 Komponen Tabel

### Table Components
**Path:** `src/components/ui/table/index.tsx`
```tsx
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";

<Table>
  <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
    <TableRow>
      <TableCell isHeader className="py-3 font-medium text-gray-500 text-theme-xs">
        Kolom Header
      </TableCell>
    </TableRow>
  </TableHeader>
  <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
    <TableRow>
      <TableCell className="py-3 text-gray-500 text-theme-sm">Data</TableCell>
    </TableRow>
  </TableBody>
</Table>
```
- Wrapper tabel: `overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6`
- Overflow: `max-w-full overflow-x-auto`

---

## 🃏 Card / Panel Pattern

```tsx
// Pola card standar yang digunakan di project:
<div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
  {/* konten */}
</div>
```

Varian dark background card:
```
dark:bg-white/[0.03]   ← card biasa di dark mode
dark:bg-gray-900       ← komponen solid di dark mode
```

---

## 🔧 Context & Hooks

### SidebarContext
**Path:** `src/context/SidebarContext.tsx`
```tsx
import { useSidebar } from "@/context/SidebarContext";

const { 
  isExpanded,          // boolean - sidebar terbuka penuh
  isMobileOpen,        // boolean - sidebar mobile terbuka
  isHovered,           // boolean - mouse hover pada sidebar
  activeItem,          // string | null
  openSubmenu,         // string | null
  toggleSidebar,       // () => void
  toggleMobileSidebar, // () => void
  setIsHovered,        // (v: boolean) => void
  setActiveItem,       // (item: string | null) => void
  toggleSubmenu,       // (item: string) => void
} = useSidebar();
```

### ThemeContext
**Path:** `src/context/ThemeContext.tsx`
```tsx
import { useTheme } from "@/context/ThemeContext";

const { theme, toggleTheme } = useTheme();
// theme: "light" | "dark"
// Tema disimpan di localStorage dan class "dark" ditambahkan ke <html>
```

### useModal
**Path:** `src/hooks/useModal.ts`
```tsx
import useModal from "@/hooks/useModal";

const { isOpen, openModal, closeModal } = useModal();
```

### useGoBack
**Path:** `src/hooks/useGoBack.ts`
```tsx
import useGoBack from "@/hooks/useGoBack";
// Navigasi kembali ke halaman sebelumnya
```

---

## 🎯 Icon Library

**Path:** `src/icons/index.tsx`  
Import: `import { NamaIcon } from "@/icons"`

| Icon | Nama Export | File SVG |
|---|---|---|
| Plus | `PlusIcon` | plus.svg |
| Close | `CloseIcon` | close.svg |
| Box | `BoxIcon` | box.svg |
| Check Circle | `CheckCircleIcon` | check-circle.svg |
| Alert | `AlertIcon` | alert.svg |
| Info | `InfoIcon` | info.svg |
| Error/Hexa | `ErrorIcon` | info-hexa.svg |
| Bolt | `BoltIcon` | bolt.svg |
| Arrow Up | `ArrowUpIcon` | arrow-up.svg |
| Arrow Down | `ArrowDownIcon` | arrow-down.svg |
| Arrow Right | `ArrowRightIcon` | arrow-right.svg |
| Folder | `FolderIcon` | folder.svg |
| Video | `VideoIcon` | videos.svg |
| Audio | `AudioIcon` | audio.svg |
| Grid | `GridIcon` | grid.svg |
| File | `FileIcon` | file.svg |
| Download | `DownloadIcon` | download.svg |
| Group/Users | `GroupIcon` | group.svg |
| Box Line | `BoxIconLine` | box-line.svg |
| Shooting Star | `ShootingStarIcon` | shooting-star.svg |
| Dollar | `DollarLineIcon` | dollar-line.svg |
| Trash | `TrashBinIcon` | trash.svg |
| Angle Up | `AngleUpIcon` | angle-up.svg |
| Angle Down | `AngleDownIcon` | angle-down.svg |
| Pencil/Edit | `PencilIcon` | pencil.svg |
| Check Line | `CheckLineIcon` | check-line.svg |
| Close Line | `CloseLineIcon` | close-line.svg |
| Chevron Down | `ChevronDownIcon` | chevron-down.svg |
| Chevron Up | `ChevronUpIcon` | chevron-up.svg |
| Chevron Left | `ChevronLeftIcon` | chevron-left.svg |
| Paper Plane | `PaperPlaneIcon` | paper-plane.svg |
| Lock | `LockIcon` | lock.svg |
| Envelope | `EnvelopeIcon` | envelope.svg |
| User | `UserIcon` | user-line.svg |
| Calendar | `CalenderIcon` | calender-line.svg |
| Eye | `EyeIcon` | eye.svg |
| Eye Close | `EyeCloseIcon` | eye-close.svg |
| Time | `TimeIcon` | time.svg |
| Copy | `CopyIcon` | copy.svg |
| User Circle | `UserCircleIcon` | user-circle.svg |
| Task | `TaskIcon` | task-icon.svg |
| List | `ListIcon` | list.svg |
| Table | `TableIcon` | table.svg |
| Page | `PageIcon` | page.svg |
| Pie Chart | `PieChartIcon` | pie-chart.svg |
| Box Cube | `BoxCubeIcon` | box-cube.svg |
| Plug In | `PlugInIcon` | plug-in.svg |
| Docs | `DocsIcon` | docs.svg |
| Mail | `MailIcon` | mail-line.svg |
| Horizontal Dots | `HorizontaLDots` | horizontal-dots.svg |
| Chat | `ChatIcon` | chat.svg |
| More Dot | `MoreDotIcon` | more-dot.svg |
| Bell | `BellIcon` | bell.svg |

---

## 🗺️ Routing & Navigasi Sidebar

### Menu Utama (navItems)
| Nama | Path | Icon |
|---|---|---|
| Dashboard → Ecommerce | `/` | GridIcon |
| Calendar | `/calendar` | CalenderIcon |
| User Profile | `/profile` | UserCircleIcon |
| Forms → Form Elements | `/form-elements` | ListIcon |
| Tables → Basic Tables | `/basic-tables` | TableIcon |
| Pages → Blank Page | `/blank` | PageIcon |
| Pages → 404 Error | `/error-404` | PageIcon |

### Others (othersItems)
| Nama | Path | Icon |
|---|---|---|
| Charts → Line Chart | `/line-chart` | PieChartIcon |
| Charts → Bar Chart | `/bar-chart` | PieChartIcon |
| UI Elements → Alerts | `/alerts` | BoxCubeIcon |
| UI Elements → Avatar | `/avatars` | BoxCubeIcon |
| UI Elements → Badge | `/badge` | BoxCubeIcon |
| UI Elements → Buttons | `/buttons` | BoxCubeIcon |
| UI Elements → Images | `/images` | BoxCubeIcon |
| UI Elements → Videos | `/videos` | BoxCubeIcon |
| Authentication → Sign In | `/signin` | PlugInIcon |
| Authentication → Sign Up | `/signup` | PlugInIcon |

---

## 🌙 Dark Mode

Project menggunakan class-based dark mode via Tailwind v4:
```css
@custom-variant dark (&:is(.dark *));
```

- Dark class ditambahkan ke `<html>` via ThemeContext
- Tema disimpan di `localStorage` dengan key `"theme"`
- Default: `"light"`

### Pola Dark Mode yang Digunakan:
```
bg-white dark:bg-gray-900           ← sidebar, header, card solid
bg-white dark:bg-white/[0.03]       ← card dengan efek glass
text-gray-800 dark:text-white/90    ← teks utama
text-gray-500 dark:text-gray-400    ← teks sekunder/label
border-gray-200 dark:border-gray-800 ← border standar
```

---

## 📐 Layout Grid Pattern

```tsx
// Grid 12 kolom — pola dashboard utama:
<div className="grid grid-cols-12 gap-4 md:gap-6">
  <div className="col-span-12 xl:col-span-7"> ... </div>
  <div className="col-span-12 xl:col-span-5"> ... </div>
  <div className="col-span-12"> ... </div>
</div>

// Grid 2 kolom — metric cards:
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
```

---

## 🔌 Third-Party CSS Integration

File CSS yang di-import di `globals.css`:
- ApexCharts: custom styling `.apexcharts-*`
- Flatpickr: custom styling `.flatpickr-*`
- FullCalendar: custom styling `.fc-*`
- Swiper: custom styling `.swiper-*`
- JVectorMap: custom styling `.jvectormap-*`

---

## ✅ Checklist Pengembangan Fitur Baru

Saat menambahkan halaman atau fitur baru, pastikan:

- [ ] Halaman berada di route yang sesuai (`(admin)` atau `(full-width-pages)`)
- [ ] Gunakan `PageBreadcrumb` di atas konten halaman
- [ ] Wrap konten dalam card dengan `rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]`
- [ ] Gunakan color token dari palette (bukan warna hardcode)
- [ ] Selalu tambahkan varian `dark:` untuk mendukung dark mode
- [ ] Gunakan komponen `Button`, `Input`, `Badge`, `Alert`, `Modal` yang sudah ada
- [ ] Import icon dari `@/icons` (tidak buat SVG inline baru jika sudah ada)
- [ ] Navigasi baru ditambahkan ke `navItems` atau `othersItems` di `AppSidebar.tsx`
- [ ] Gunakan font `font-outfit` (sudah di-set sebagai default body)
- [ ] Gunakan breakpoint yang sudah didefinisikan: `2xsm`, `xsm`, `sm`, `md`, `lg`, `xl`, `2xl`

---

*Dibuat otomatis oleh scan project — 2026-05-25*
