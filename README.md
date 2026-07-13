# Oath — The Ledger Court

**Promises with consequences.**

Oath is a public accountability layer built on GenLayer StudioNet. Users lock plain-English commitments on-chain, attach approved evidence sources, and let GenLayer's decentralized AI validators judge whether the promise was fulfilled.

## Why GenLayer is Required

A normal deterministic smart contract cannot answer:
- Did the shipped product match the promised scope?
- Is the submitted evidence credible or cherry-picked?
- Does the failure fall under a stated exclusion?
- Was fulfilment partial or complete?

GenLayer Intelligent Contracts process natural language, unstructured evidence, and live public URLs through decentralized AI-validator consensus — making natural-language promise verification possible on-chain.

---

## Stack

- **Contract:** Python Intelligent Contract (`contracts/oath.py`) on GenLayer StudioNet
- **Frontend:** Next.js 16 + TypeScript + Tailwind CSS v4 + Framer Motion
- **Chain interaction:** genlayer-js
- **State:** TanStack Query
- **Network:** StudioNet (chain ID 61999)

---

## Contract Methods

| Method | Description |
|---|---|
| `create_oath` | Lock a promise on-chain with criteria, deadline, and evidence sources |
| `submit_evidence` | Submit a public URL as fulfilment, challenge, context, or exclusion evidence |
| `request_verdict` | Trigger GenLayer validator consensus to judge the oath |
| `submit_appeal` | File an appeal against a settled verdict |
| `request_appeal_verdict` | Trigger validator re-review of a filed appeal |

**Deployed contract:** `0xB2a42fC3b8DF9398C7E8f2D31129f9c424AD2ce2`

---

## Pages

| Route | Name | Description |
|---|---|---|
| `/` | Court Entrance | Hero + how it works |
| `/create` | Promise Chamber | 6-step guided oath builder |
| `/oaths` | The Oath Ledger | All oaths table view |
| `/oaths/[id]` | Oath Detail | Seal, timeline, evidence wall, verdict receipt, appeals |
| `/arena` | Judgment Arena | Live status feed by stage |
| `/receipts` | Settlement Archive | All settled oaths with receipts |

---

## Setup

```bash
npm install
cp .env.example .env.local
# Deploy contract, fill NEXT_PUBLIC_OATH_CONTRACT_ADDRESS
npm run dev
```

## Contract

Deploy `contracts/oath.py` to StudioNet via [GenLayer Studio](https://studio.genlayer.com) or the CLI.

## Tests

```bash
genlayer test tests/direct/test_oath_contract.py
```

## Getting Started (original)

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
