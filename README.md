# CreditChain

CreditChain is a privacy-first, decentralized platform for sharing financial tips — credit-building, debt strategies, investments — anonymously and securely on the blockchain.

No emails, no tracking, just useful financial advice.

---

## Features

* Anonymous tips with hashed IDs
* Blockchain-backed insights
* Community upvotes
* Smart ranking: `score = upvotes / (age_in_days + 2)^1.8`
* 8 financial categories
* Real-time dashboard with charts
* Responsive UI

---

## Categories

| ID                | Name                |
| ----------------- | ------------------- |
| credit-building   | Credit Building     |
| credit-cards      | Credit Cards        |
| debt-payoff       | Debt Payoff         |
| loans             | Loans & Lending     |
| investments       | Investments         |
| savings           | Savings & Budgeting |
| identity-theft    | Identity Theft      |
| credit-monitoring | Credit Monitoring   |

---

## How It Works

1. Submit a tip with optional details and category.
2. Tip gets a `hashedId` and is sent to the backend.
3. Backend records tip on-chain.
4. Users can upvote tips (one per user, stored locally).
5. Tips are ranked by upvotes and age.

---

## Tech Stack

* **Frontend:** React + TypeScript + Tailwind
* **Charts:** react-chartjs-2 + Chart.js
* **Icons:** lucide-react
* **API:** REST (`getAllInsights`, `postInsight`, `addUpvote`)
* **State:** React Hooks
* **Privacy:** Client-side hashed IDs

---

## API

```ts
GET  /api/insights          → getAllInsights()
POST /api/insights          → postInsight(payload)
POST /api/insights/:id/upvote → addUpvote(id)
```

---

## Setup

```bash
git clone https://github.com/yourname/creditchain.git
cd creditchain
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Folder Structure

```text
/src
  /components  → UI components
/lib
  api.ts       → API calls
/types
  insight.ts   → Type definitions
/public       → icons, images
App.tsx       → Main component
```

---

## Contributing

1. Fork the repo
2. Create a branch `feat/your-feature`
3. Commit your changes
4. Push and open a PR

---

## License

MIT License

If you want, I can **also make a 1–page ultra-minimal version** for GitHub that’s even shorter. Do you want me to do that?
