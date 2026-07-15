;; ===========================================================================
;; Rendezvous property-based tests for covault-core.
;;
;; These functions are appended to a VERBATIM copy of contracts/covault-core.clar
;; to produce security/covault-core.rv.clar (the deployed contract file is never
;; modified). Every function is annotated `;; #[env(simnet)]`, so it exists only
;; in the fuzzing simnet and is stripped on any real-network deploy.
;;
;; They fuzz calc-payoff - the pure settlement arithmetic that the whole
;; "solvent by construction" claim rests on. exercise pays qty * calc-payoff;
;; reclaim pays qty * (max-payoff - calc-payoff). If calc-payoff could ever
;; exceed max-payoff, a writer would owe more than they locked AND reclaim would
;; underflow-abort. Property #1 and #2 rule that out for all inputs.
;;
;; Run: npx rv . covault-core test   (uses Clarinet-covault-core.toml)
;; Error codes u900-u905 are test-only and do not exist in the deployed contract.
;; ===========================================================================

;; #[env(simnet)]
;; SOLVENCY BOUND: one contract's payoff can never exceed the collateral locked
;; for it (max-payoff). This is the entire guarantee.
(define-private (test-payoff-never-exceeds-collateral
    (is-call bool)
    (strike uint)
    (max-payoff uint)
    (price uint)
  )
  (begin
    (asserts! (<= (calc-payoff is-call strike max-payoff price) max-payoff) (err u900))
    (ok true)
  )
)

;; #[env(simnet)]
;; CONSERVATION: payoff + leftover == collateral, with leftover computed exactly
;; as reclaim does - (- max-payoff payoff). That subtraction underflow-aborts if
;; payoff > max-payoff, so this property also proves reclaim never aborts on a
;; solvent series. This is the conserved-sum motif, fuzzed.
(define-private (test-payoff-leftover-conserves
    (is-call bool)
    (strike uint)
    (max-payoff uint)
    (price uint)
  )
  (let (
      (payoff (calc-payoff is-call strike max-payoff price))
      (leftover (- max-payoff (calc-payoff is-call strike max-payoff price)))
    )
    (asserts! (is-eq (+ payoff leftover) max-payoff) (err u901))
    (ok true)
  )
)

;; #[env(simnet)]
;; An out-of-the-money put (settlement at or above strike) is worthless.
(define-read-only (can-test-put-otm-zero (strike uint) (max-payoff uint) (price uint))
  (>= price strike)
)
(define-private (test-put-otm-zero
    (strike uint)
    (max-payoff uint)
    (price uint)
  )
  (begin
    (asserts! (is-eq (calc-payoff false strike max-payoff price) u0) (err u902))
    (ok true)
  )
)

;; #[env(simnet)]
;; An out-of-the-money call (settlement at or below strike) is worthless.
(define-read-only (can-test-call-otm-zero (strike uint) (max-payoff uint) (price uint))
  (<= price strike)
)
(define-private (test-call-otm-zero
    (strike uint)
    (max-payoff uint)
    (price uint)
  )
  (begin
    (asserts! (is-eq (calc-payoff true strike max-payoff price) u0) (err u903))
    (ok true)
  )
)

;; #[env(simnet)]
;; An in-the-money put whose intrinsic value is below the cap pays exactly
;; strike - price (correctness, not just the bound).
(define-read-only (can-test-put-itm-intrinsic (strike uint) (max-payoff uint) (price uint))
  (and (> strike price) (<= (- strike price) max-payoff))
)
(define-private (test-put-itm-intrinsic
    (strike uint)
    (max-payoff uint)
    (price uint)
  )
  (begin
    (asserts! (is-eq (calc-payoff false strike max-payoff price) (- strike price)) (err u904))
    (ok true)
  )
)

;; #[env(simnet)]
;; An in-the-money call whose intrinsic value is below the cap pays exactly
;; price - strike.
(define-read-only (can-test-call-itm-intrinsic (strike uint) (max-payoff uint) (price uint))
  (and (> price strike) (<= (- price strike) max-payoff))
)
(define-private (test-call-itm-intrinsic
    (strike uint)
    (max-payoff uint)
    (price uint)
  )
  (begin
    (asserts! (is-eq (calc-payoff true strike max-payoff price) (- price strike)) (err u905))
    (ok true)
  )
)
