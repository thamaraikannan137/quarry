# Quarry frontend

Vite + React 19 + Ant Design app for Arun Granites Quarry Manager.

## Phase 1 (done)

- Login at `/login` — username + password, mock demo users from the Chithanavasal prototype
- App chrome: Ant Design sider + header (quarry switcher, mode, user/color presets)
- Theme persisted in `localStorage` (`quarry-settings-antd`): mode, primary color, layout
- Session persisted in `quarry-session`
- Mobile: Drawer sidenav below 1200px
- Dashboard (`/`): Recharts cash-flow bars + expense donut, stats, recent transactions
- Block Marking: summary at `/marking`; add at `/marking/new`; detail at `/marking/:batchId`; edit at `/marking/:batchId/edit`; invoice payments (partial/full Cash Received via `markingBatchId`)
- Block Load (`/loads`): lorry trips with date, from→to, lorry no; one trip can carry blocks from different markings; load OK/Pending is derived from trip membership
- Customers (`/customers`): list; detail page at `/customers/:partyId`; add/edit via form modal
- All Transactions: category-driven extra fields (party, staff/gang link, litres, ref) via `categoryFields.ts`
- Shared UI: `DataTable` + `TableCard` + `useInfiniteList` in `src/components/common` for feature list pages
- Other business routes stay placeholders

## Demo logins

| Username | Password | Role | Access |
| --- | --- | --- | --- |
| owner | owner123 | Owner | All quarries |
| accounts | acc123 | Accountant | Both |
| chitha | chitha123 | Accountant | Chithanavasal |
| view | view123 | Viewer | Dashboard & P&L only |

## Later phases

Wire remaining nav stubs (sale, PI, HR, etc.) and replace mock auth with the Quarry API.
