;; covault-core
;; Fully-collateralized, cash-settled European options clearinghouse for Stacks.
;;
;; Design (kept deliberately small and solvent-by-construction):
;;  - Every option is backed 100% by collateral locked in the contract. Because
;;    collateral >= the maximum possible payoff, a writer can NEVER become insolvent,
;;    so there is no liquidation engine, no margin, and no funding rate.
;;  - Each series chooses its collateral/settlement asset: native STX or any SIP-010
;;    token (sBTC by default). The asset is stored as (optional principal):
;;      none      => native STX
;;      (some P)  => the SIP-010 token deployed at P
;;  - Options are European: they can only be exercised after a settlement price is
;;    recorded at/after expiry.
;;  - The "underlying" is a price reference (e.g. BTC-USD, STX-USD) expressed in the
;;    collateral asset's smallest units. 1 contract = exposure to 1 unit of that reference.
;;  - Settlement prices come from an authorized reporter (the `oracle` principal). This is
;;    the one trusted component in the prototype; the production path is a Pyth feed or DEX
;;    TWAP (the contract only needs a single price at expiry).
;;
;; Value flow per contract, given collateral C = max-payoff and settlement price S:
;;   write   -> writer locks C, receives 1 long + 1 short
;;   settle  -> reporter records S
;;   exercise(long)  -> holder is paid payoff = min(intrinsic(S), C)
;;   reclaim(short)  -> writer is paid C - payoff
;; payoff + (C - payoff) == C, so escrow is conserved exactly with no rounding.

(use-trait sip010 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

;; --- errors ---
(define-constant ERR-NOT-OWNER (err u100))
(define-constant ERR-NOT-ORACLE (err u101))
(define-constant ERR-SERIES-NOT-FOUND (err u102))
(define-constant ERR-INVALID-PARAMS (err u103))
(define-constant ERR-EXPIRED (err u104))
(define-constant ERR-NOT-EXPIRED (err u105))
(define-constant ERR-ALREADY-SETTLED (err u106))
(define-constant ERR-NOT-SETTLED (err u107))
(define-constant ERR-INSUFFICIENT-LONG (err u108))
(define-constant ERR-INSUFFICIENT-SHORT (err u109))
(define-constant ERR-WRONG-TOKEN (err u110))
(define-constant ERR-ZERO (err u111))
(define-constant ERR-OFFER-NOT-FOUND (err u112))
(define-constant ERR-INSUFFICIENT-OFFER (err u113))
(define-constant ERR-NOT-OFFER-MAKER (err u114))

;; --- governance ---
(define-data-var contract-owner principal tx-sender)
(define-data-var oracle principal tx-sender)