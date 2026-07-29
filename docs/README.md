# Covault - Documentation

Design and planning docs for Covault, a fully-collateralized, cash-settled European options
clearinghouse on Stacks. Start with the top-level [project README](../README.md) for the
contract overview and quickstart.

## Product and technical specs

| Doc | What it covers |
| --- | --- |
| [PRD](./PRD.md) | Product requirements: problem, users, scope, features, success metrics, risks |
| [TRD](./TRD.md) | Technical requirements: architecture, contract spec, ABI, asset handling, security |
| [UX Design Brief](./UX-DESIGN-BRIEF.md) | Design principles, visual direction, key screens, components, states |
| [App Flow](./APP-FLOW.md) | Series state machine, user journeys, action-to-contract mapping |
| [Implementation Plan](./IMPLEMENTATION-PLAN.md) | Milestone-mapped build plan, acceptance criteria, deploy runbook |
| [Roadmap](./ROADMAP.md) | High-level done / next / later view |
| [M1 Evidence](./M1-EVIDENCE.md) | Testnet deployment + full lifecycle proof (explorer-linked transactions) |
| [Settlement Methodology](./SETTLEMENT-METHODOLOGY.md) | Price source, cross-rate derivation, freshness checks, failure modes, risk disclosures |
| [Security Review](./SECURITY-REVIEW.md) | Threat model, invariant fuzzing, adversarial tests, static checks, findings log |

## Reading order

1. PRD - what we are building and why.
2. TRD - how it works, and the frozen contract interface.
3. UX Design Brief + App Flow - what the dApp looks like and how users move through it.
4. Implementation Plan - the milestone-by-milestone build and deployment steps.

## Source of truth

The contract (`../contracts/covault-core.clar`) and its test suite
(`../tests/covault-core.test.ts`) are the source of truth for behavior. These docs describe
intent and plans; where they differ from the contract, the contract wins.
