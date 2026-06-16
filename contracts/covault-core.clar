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

;; --- series registry ---
;; strike / max-payoff / settlement-price are all denominated in the collateral
;; asset's smallest units, per single contract.
(define-map series
  uint
  {
    creator: principal,
    quote-token: (optional principal), ;; none = native STX, (some P) = SIP-010 token P
    underlying: (string-ascii 16), ;; informational price reference label, e.g. "BTC-USD"
    is-call: bool,
    strike: uint,
    max-payoff: uint, ;; collateral locked per contract (caps the payoff)
    expiry: uint, ;; burn-block-height at/after which settlement is allowed
    settled: bool,
    settlement-price: uint,
  }
)

;; long positions (option holders) and short positions (collateral providers)
(define-map longs
  {
    series-id: uint,
    owner: principal,
  }
  uint
)
(define-map shorts
  {
    series-id: uint,
    owner: principal,
  }
  uint
)

;; minimal on-chain order book: makers escrow long positions for sale
(define-map offers
  uint
  {
    series-id: uint,
    maker: principal,
    qty: uint,
    price: uint, ;; collateral units per contract
    quote-token: (optional principal), ;; mirrors the series' settlement asset
  }
)

;; asset movement helpers (native STX or SIP-010)
;; ---------------------------------------------------------------------------

;; Move `amount` of the series asset FROM the current tx-sender TO `recipient`.
;; Used for collateral deposits (recipient = the contract) and order fills
;; (recipient = the maker). The SIP-010 branch authorizes via tx-sender == sender.
(define-private (pull-to
    (q (optional principal))
    (token (optional <sip010>))
    (amount uint)
    (recipient principal)
  )
  (match q
    p (let ((t (unwrap! token ERR-WRONG-TOKEN)))
      (asserts! (is-eq (contract-of t) p) ERR-WRONG-TOKEN)
      (contract-call? t transfer amount tx-sender recipient none)
    )
    (stx-transfer? amount tx-sender recipient)
  )
)

;; Move `amount` of the series asset FROM the contract's own escrow TO `recipient`.
;; SIP-010: the contract is `sender`, so sBTC's (is-eq contract-caller sender) check
;; authorizes it. Native STX: needs as-contract? to switch tx-sender to the contract,
;; with a with-stx allowance bounding the outflow (Clarity 4 asset safety).
(define-private (push-from-contract
    (q (optional principal))
    (token (optional <sip010>))
    (amount uint)
    (recipient principal)
  )
  (match q
    p (let ((t (unwrap! token ERR-WRONG-TOKEN)))
      (asserts! (is-eq (contract-of t) p) ERR-WRONG-TOKEN)
      (contract-call? t transfer amount current-contract recipient none)
    )
    (as-contract? ((with-stx amount))
      (try! (stx-transfer? amount tx-sender recipient))
    )
  )
)

;; ---------------------------------------------------------------------------
;; read-only
;; ---------------------------------------------------------------------------

(define-read-only (get-series (id uint))
  (map-get? series id)
)

(define-read-only (get-long
    (id uint)
    (who principal)
  )
  (default-to u0 (map-get? longs {
    series-id: id,
    owner: who,
  })
  )
)