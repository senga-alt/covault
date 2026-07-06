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
(define-constant ERR-PAUSED (err u115))
(define-constant ERR-CREATION-RESTRICTED (err u116))
(define-constant ERR-FEE-TOO-HIGH (err u117))

;; --- limits ---
(define-constant MAX-FEE-BPS u500) ;; hard cap on the protocol fee: 5%

;; --- governance ---
(define-data-var contract-owner principal tx-sender)
(define-data-var oracle principal tx-sender)
(define-data-var paused bool false)
(define-data-var open-creation bool false) ;; v1 curated: only owner creates series until opened
(define-data-var fee-bps uint u0) ;; taker fee on order-book fills, in basis points (0 = off)
(define-data-var fee-recipient principal tx-sender)

;; --- counters ---
(define-data-var next-series-id uint u0)
(define-data-var next-offer-id uint u0)

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

;; ---------------------------------------------------------------------------
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

(define-read-only (get-short
    (id uint)
    (who principal)
  )
  (default-to u0 (map-get? shorts {
    series-id: id,
    owner: who,
  })
  )
)

(define-read-only (get-offer (id uint))
  (map-get? offers id)
)

(define-read-only (get-oracle)
  (var-get oracle)
)
(define-read-only (get-owner)
  (var-get contract-owner)
)
(define-read-only (get-series-count)
  (var-get next-series-id)
)
(define-read-only (get-offer-count)
  (var-get next-offer-id)
)

;; One-shot snapshot of protocol config for UIs.
(define-read-only (get-config)
  {
    owner: (var-get contract-owner),
    oracle: (var-get oracle),
    paused: (var-get paused),
    open-creation: (var-get open-creation),
    fee-bps: (var-get fee-bps),
    fee-recipient: (var-get fee-recipient),
    series-count: (var-get next-series-id),
    offer-count: (var-get next-offer-id),
  }
)

;; intrinsic value of one contract at a given price, capped at the locked collateral
(define-private (calc-payoff
    (is-call bool)
    (strike uint)
    (max-payoff uint)
    (price uint)
  )
  (let ((intrinsic (if is-call
      (if (> price strike)
        (- price strike)
        u0
      )
      (if (> strike price)
        (- strike price)
        u0
      )
    )))
    (if (> intrinsic max-payoff)
      max-payoff
      intrinsic
    )
  )
)

;; what one contract would pay at an arbitrary price (for UIs / quoting)
(define-read-only (quote-payoff
    (id uint)
    (price uint)
  )
  (match (map-get? series id)
    s (ok (calc-payoff (get is-call s) (get strike s) (get max-payoff s) price))
    ERR-SERIES-NOT-FOUND
  )
)

;; ---------------------------------------------------------------------------
;; series lifecycle
;; ---------------------------------------------------------------------------

;; Create a new option series. Pass (some token) to collateralize in a SIP-010 token
;; such as sBTC, or none to collateralize in native STX.
;; For puts the maximum loss is the strike, so collateral (max-payoff) must equal the
;; strike. For calls, max-payoff is the chosen price cap above the strike (a capped /
;; spread call), which is what makes calls fully collateralizable in cash.
;; #[allow(unchecked_data)]
(define-public (create-series
    (quote-token (optional <sip010>))
    (underlying (string-ascii 16))
    (is-call bool)
    (strike uint)
    (max-payoff uint)
    (expiry uint)
  )
  (let ((id (var-get next-series-id)))
    (asserts! (> strike u0) ERR-INVALID-PARAMS)
    (asserts! (> max-payoff u0) ERR-INVALID-PARAMS)
    (asserts! (> expiry burn-block-height) ERR-INVALID-PARAMS)
    (asserts! (or is-call (is-eq max-payoff strike)) ERR-INVALID-PARAMS)
    (map-set series id {
      creator: tx-sender,
      quote-token: (match quote-token
        t (some (contract-of t))
        none
      ),
      underlying: underlying,
      is-call: is-call,
      strike: strike,
      max-payoff: max-payoff,
      expiry: expiry,
      settled: false,
      settlement-price: u0,
    })
    (var-set next-series-id (+ id u1))
    (print {
      event: "create-series",
      id: id,
      is-call: is-call,
      strike: strike,
      max-payoff: max-payoff,
      expiry: expiry,
    })
    (ok id)
  )
)

;; Lock collateral and mint matched long + short positions to the writer.
;; The writer can then sell the longs (premium) and keep the shorts (obligation).
;; `token` must be (some asset) matching the series for SIP-010 series, or none for STX.
;; #[allow(unchecked_data)]
(define-public (write-options
    (id uint)
    (qty uint)
    (token (optional <sip010>))
  )
  (let ((s (unwrap! (map-get? series id) ERR-SERIES-NOT-FOUND)))
    (asserts! (> qty u0) ERR-ZERO)
    (asserts! (not (get settled s)) ERR-ALREADY-SETTLED)
    (asserts! (< burn-block-height (get expiry s)) ERR-EXPIRED)
    (let ((collateral (* qty (get max-payoff s))))
      (try! (pull-to (get quote-token s) token collateral current-contract))
      (map-set longs {
        series-id: id,
        owner: tx-sender,
      }
        (+ (get-long id tx-sender) qty)
      )
      (map-set shorts {
        series-id: id,
        owner: tx-sender,
      }
        (+ (get-short id tx-sender) qty)
      )
      (print {
        event: "write",
        id: id,
        writer: tx-sender,
        qty: qty,
        collateral: collateral,
      })
      (ok collateral)
    )
  )
)

;; Transfer long (option) positions to another principal - options are tradable.
;; #[allow(unchecked_data)]
(define-public (transfer-long
    (id uint)
    (qty uint)
    (recipient principal)
  )
  (let ((bal (get-long id tx-sender)))
    (asserts! (> qty u0) ERR-ZERO)
    (asserts! (>= bal qty) ERR-INSUFFICIENT-LONG)
    (map-set longs {
      series-id: id,
      owner: tx-sender,
    }
      (- bal qty)
    )
    (map-set longs {
      series-id: id,
      owner: recipient,
    }
      (+ (get-long id recipient) qty)
    )
    (print {
      event: "transfer-long",
      id: id,
      from: tx-sender,
      to: recipient,
      qty: qty,
    })
    (ok true)
  )
)

;; Net out matching long+short positions before expiry and reclaim collateral.
;; #[allow(unchecked_data)]
(define-public (close-pair
    (id uint)
    (qty uint)
    (token (optional <sip010>))
  )
  (let (
      (s (unwrap! (map-get? series id) ERR-SERIES-NOT-FOUND))
      (l (get-long id tx-sender))
      (sh (get-short id tx-sender))
      (sender tx-sender)
    )
    (asserts! (> qty u0) ERR-ZERO)
    (asserts! (>= l qty) ERR-INSUFFICIENT-LONG)
    (asserts! (>= sh qty) ERR-INSUFFICIENT-SHORT)
    (map-set longs {
      series-id: id,
      owner: sender,
    } (- l qty)
    )
    (map-set shorts {
      series-id: id,
      owner: sender,
    } (- sh qty)
    )
    (let ((refund (* qty (get max-payoff s))))
      (try! (push-from-contract (get quote-token s) token refund sender))
      (print {
        event: "close-pair",
        id: id,
        owner: sender,
        qty: qty,
        refund: refund,
      })
      (ok refund)
    )
  )
)

;; ---------------------------------------------------------------------------
;; settlement
;; ---------------------------------------------------------------------------

;; Record the settlement price for an expired series. Only the authorized oracle.
(define-public (settle
    (id uint)
    (price uint)
  )
  (let ((s (unwrap! (map-get? series id) ERR-SERIES-NOT-FOUND)))
    (asserts! (is-eq tx-sender (var-get oracle)) ERR-NOT-ORACLE)
    (asserts! (>= burn-block-height (get expiry s)) ERR-NOT-EXPIRED)
    (asserts! (not (get settled s)) ERR-ALREADY-SETTLED)
    (map-set series id
      (merge s {
        settled: true,
        settlement-price: price,
      })
    )
    (print {
      event: "settle",
      id: id,
      price: price,
    })
    (ok true)
  )
)

;; Holder claims the cash payoff for their long positions after settlement.
;; #[allow(unchecked_data)]
(define-public (exercise
    (id uint)
    (qty uint)
    (token (optional <sip010>))
  )
  (let (
      (s (unwrap! (map-get? series id) ERR-SERIES-NOT-FOUND))
      (bal (get-long id tx-sender))
      (sender tx-sender)
    )
    (asserts! (> qty u0) ERR-ZERO)
    (asserts! (get settled s) ERR-NOT-SETTLED)
    (asserts! (>= bal qty) ERR-INSUFFICIENT-LONG)
    (let ((payoff (* qty
        (calc-payoff (get is-call s) (get strike s) (get max-payoff s)
          (get settlement-price s)
        ))))
      (map-set longs {
        series-id: id,
        owner: sender,
      }
        (- bal qty)
      )
      (and
        (> payoff u0)
        (try! (push-from-contract (get quote-token s) token payoff sender))
      )
      (print {
        event: "exercise",
        id: id,
        holder: sender,
        qty: qty,
        payoff: payoff,
      })
      (ok payoff)
    )
  )
)

;; Writer reclaims leftover collateral (collateral minus what holders are owed).
;; #[allow(unchecked_data)]
(define-public (reclaim
    (id uint)
    (qty uint)
    (token (optional <sip010>))
  )
  (let (
      (s (unwrap! (map-get? series id) ERR-SERIES-NOT-FOUND))
      (bal (get-short id tx-sender))
      (sender tx-sender)
    )
    (asserts! (> qty u0) ERR-ZERO)
    (asserts! (get settled s) ERR-NOT-SETTLED)
    (asserts! (>= bal qty) ERR-INSUFFICIENT-SHORT)
    (let ((leftover (* qty
        (- (get max-payoff s)
          (calc-payoff (get is-call s) (get strike s) (get max-payoff s)
            (get settlement-price s)
          ))
      )))
      (map-set shorts {
        series-id: id,
        owner: sender,
      }
        (- bal qty)
      )
      (and
        (> leftover u0)
        (try! (push-from-contract (get quote-token s) token leftover sender))
      )
      (print {
        event: "reclaim",
        id: id,
        writer: sender,
        qty: qty,
        leftover: leftover,
      })
      (ok leftover)
    )
  )
)

;; ---------------------------------------------------------------------------
;; order book (peer-to-peer trading of long positions)
;; ---------------------------------------------------------------------------

;; List long positions for sale. The longs are escrowed in the contract.
(define-public (list-offer
    (id uint)
    (qty uint)
    (price uint)
  )
  (let (
      (s (unwrap! (map-get? series id) ERR-SERIES-NOT-FOUND))
      (bal (get-long id tx-sender))
      (offer-id (var-get next-offer-id))
      (escrow current-contract)
    )
    (asserts! (> qty u0) ERR-ZERO)
    (asserts! (> price u0) ERR-ZERO)
    (asserts! (>= bal qty) ERR-INSUFFICIENT-LONG)
    (map-set longs {
      series-id: id,
      owner: tx-sender,
    }
      (- bal qty)
    )
    (map-set longs {
      series-id: id,
      owner: escrow,
    }
      (+ (get-long id escrow) qty)
    )
    (map-set offers offer-id {
      series-id: id,
      maker: tx-sender,
      qty: qty,
      price: price,
      quote-token: (get quote-token s),
    })
    (var-set next-offer-id (+ offer-id u1))
    (print {
      event: "list-offer",
      offer-id: offer-id,
      id: id,
      maker: tx-sender,
      qty: qty,
      price: price,
    })
    (ok offer-id)
  )
)

;; Buy some/all of an offer: buyer pays the maker and receives the long positions.
;; #[allow(unchecked_data)]
(define-public (fill-offer
    (offer-id uint)
    (qty uint)
    (token (optional <sip010>))
  )
  (let (
      (o (unwrap! (map-get? offers offer-id) ERR-OFFER-NOT-FOUND))
      (buyer tx-sender)
      (escrow current-contract)
    )
    (asserts! (> qty u0) ERR-ZERO)
    (asserts! (<= qty (get qty o)) ERR-INSUFFICIENT-OFFER)
    (let (
        (cost (* qty (get price o)))
        (sid (get series-id o))
        (maker (get maker o))
      )
      (try! (pull-to (get quote-token o) token cost maker))
      (map-set longs {
        series-id: sid,
        owner: escrow,
      }
        (- (get-long sid escrow) qty)
      )
      (map-set longs {
        series-id: sid,
        owner: buyer,
      }
        (+ (get-long sid buyer) qty)
      )
      (map-set offers offer-id (merge o { qty: (- (get qty o) qty) }))
      (print {
        event: "fill-offer",
        offer-id: offer-id,
        buyer: buyer,
        qty: qty,
        cost: cost,
      })
      (ok cost)
    )
  )
)

;; Cancel an offer and return escrowed long positions to the maker.
;; #[allow(unchecked_data)]
(define-public (cancel-offer (offer-id uint))
  (let (
      (o (unwrap! (map-get? offers offer-id) ERR-OFFER-NOT-FOUND))
      (sid (get series-id o))
      (maker (get maker o))
      (qty (get qty o))
      (escrow current-contract)
    )
    (asserts! (is-eq tx-sender maker) ERR-NOT-OFFER-MAKER)
    (map-set longs {
      series-id: sid,
      owner: escrow,
    }
      (- (get-long sid escrow) qty)
    )
    (map-set longs {
      series-id: sid,
      owner: maker,
    }
      (+ (get-long sid maker) qty)
    )
    (map-delete offers offer-id)
    (print {
      event: "cancel-offer",
      offer-id: offer-id,
    })
    (ok true)
  )
)

;; ---------------------------------------------------------------------------
;; governance
;; ---------------------------------------------------------------------------

;; #[allow(unchecked_data)]
(define-public (set-oracle (new-oracle principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-OWNER)
    (var-set oracle new-oracle)
    (ok true)
  )
)

;; #[allow(unchecked_data)]
(define-public (set-owner (new-owner principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-OWNER)
    (var-set contract-owner new-owner)
    (ok true)
  )
)
