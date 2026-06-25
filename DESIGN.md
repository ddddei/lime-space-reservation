# Lime Space Reservation Design System

## 1. Atmosphere & Identity

블랙 배경 위에 라임 그린이 선명하게 올라오는 운영형 플랫폼이다. 신청자는 제휴공간 예약 흐름을 쉽게 따라가고, 관리자는 조건과 상태를 어두운 작업대 위에서 빠르게 판단해야 한다. 시그니처는 오프블랙 표면, Lime Platform에서 가져온 밝은 라임 액센트, 대비가 높은 상태 배지다.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Surface/primary | --surface-primary | #F7FBF4 | #060906 | Main background |
| Surface/secondary | --surface-secondary | #FFFFFF | #10160F | Cards, panels |
| Surface/elevated | --surface-elevated | #F1F8EC | #182316 | Modals, highlighted panels |
| Text/primary | --text-primary | #172014 | #F5FAF2 | Headlines, body |
| Text/secondary | --text-secondary | #5B6856 | #B7C6B0 | Captions, hints |
| Text/tertiary | --text-tertiary | #819078 | #7E8B78 | Disabled, muted |
| Border/default | --border-default | #DDE8D6 | #2C3A2B | Dividers, outlines |
| Border/subtle | --border-subtle | #EBF2E7 | #1F2A1E | Soft separations |
| Accent/primary | --accent-primary | #77B82A | #B4F147 | CTAs, focus, active controls |
| Accent/hover | --accent-hover | #5F9820 | #D2FF79 | Hover state |
| Status/success | --status-success | #178A46 | #49D17C | Available, approved |
| Status/warning | --status-warning | #B76E00 | #F5B64A | Pending, caution |
| Status/error | --status-error | #C9443E | #F27772 | Blocked, missing |
| Status/info | --status-info | #2767B1 | #78ADEC | Informational |

### Rules

- Accent is reserved for primary actions, selected states, and eligibility highlights.
- Status colors must always appear with text labels, never color alone.
- Default mode is dark. Avoid pure black `#000000`; use off-black and dark green-tinted surfaces.
- No purple/blue gradient backgrounds; the product identity is black, lime, and structured status color.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| Display | 40px | 800 | 1.15 | 0 | App title |
| H1 | 32px | 800 | 1.2 | 0 | Page headers |
| H2 | 24px | 700 | 1.3 | 0 | Section headers |
| H3 | 18px | 700 | 1.4 | 0 | Card titles |
| Body/lg | 17px | 500 | 1.6 | 0 | Lead text |
| Body | 15px | 400 | 1.6 | 0 | Default text |
| Body/sm | 14px | 400 | 1.5 | 0 | Secondary info |
| Caption | 12px | 700 | 1.4 | 0 | Labels, metadata |

### Font Stack

- Primary: "Noto Sans KR", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
- Mono: "SFMono-Regular", Consolas, monospace

### Rules

- Korean text must wrap naturally; avoid oversized headings inside compact panels.
- Body text never drops below 14px.

## 4. Spacing & Layout

### Base Unit

All spacing derives from 4px.

| Token | Value | Usage |
|-------|-------|-------|
| --space-1 | 4px | Tight inline spacing |
| --space-2 | 8px | Compact rows |
| --space-3 | 12px | Inputs, small cards |
| --space-4 | 16px | Standard card padding |
| --space-5 | 20px | Panel padding |
| --space-6 | 24px | Section inner spacing |
| --space-8 | 32px | Card groups |
| --space-10 | 40px | Major groups |
| --space-12 | 48px | Page breaks |

### Grid

- Max content width: 1280px
- Column system: one-column mobile, two-column tablet, three-column desktop where scanning benefits
- Breakpoints: sm 640px, md 768px, lg 1024px, xl 1280px

### Rules

- Cards use 8px radius.
- Admin views prioritize dense tables and compact controls.

## 5. Components

### Card
- **Structure**: dark elevated section with minimal border, soft shadow, title, metadata, and action area.
- **Variants**: selectable, status, admin.
- **Spacing**: --space-4 on mobile, --space-5 on desktop.
- **States**: hover lift, soft shadow increase, focus ring, disabled opacity.
- **Accessibility**: selectable cards are buttons.

### Status Badge
- **Structure**: short label with solid-tint background and text.
- **Variants**: available, reserved, blocked, pending, approved.
- **Spacing**: --space-1 vertical, --space-2 horizontal.
- **Accessibility**: include explicit text.

### Form Field
- **Structure**: label, input/control, optional help text.
- **States**: focus ring, disabled, error.
- **Accessibility**: every input has visible label.

### Buttons
- **Primary**: lime fill, off-black text, used for submit and active mode.
- **Secondary**: soft lime tint, used for helpful but non-final actions.
- **Ghost**: transparent dark surface, used for navigation, refresh, and close.
- **Danger**: red tint, used only for cancellation/destructive actions.

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | 120ms | ease-out | Button press, hover |
| Standard | 200ms | ease-in-out | Tabs, selection |

### Rules

- Animate only transform, opacity, border-color, and background-color.
- Respect clear disabled states for ineligible reservations.

## 7. Depth & Surface

### Strategy

Mixed: borders for structure, very soft shadows only for major cards.

| Level | Value | Usage |
|-------|-------|-------|
| Subtle | 0 1px 2px rgba(23, 32, 20, 0.04) | Cards at rest |
| Default | 0 8px 24px rgba(23, 32, 20, 0.08) | Selected panels |
