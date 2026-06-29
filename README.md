# Oath — The Ledger Court

**Promises with consequences.**

Oath is a public accountability layer built on GenLayer StudioNet. Users lock plain-English commitments on-chain, attach approved evidence sources, and let GenLayer's decentralized AI validators judge whether the promise was fulfilled.

## Why GenLayer is Required

A normal deterministic smart contract cannot answer:
- Did the shipped product match the promised scope?
- Is the submitted evidence credible or cherry-picked?
- Does the failure fall under a stated exclusion?
- Was fulfilment partial or complete?

GenLayer Intelligent Contracts process natural language, unstructured evidence, and live public URLs through decentralized AI-validator consensus.

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
